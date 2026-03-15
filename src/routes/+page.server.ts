import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { workspaces, workspaceMembers, channels, channelMembers, users } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	const userId = session.user.id!;

	// 세션은 있지만 DB에 유저가 없으면 (DB 초기화 등) 재로그인
	const dbUser = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
	if (!dbUser) redirect(302, '/login');

	// Find first workspace the user belongs to
	let membership = db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, userId))
		.get();

	if (!membership) {
		// 데모 모드: demo 워크스페이스에 자동 가입 후 진입
		if (env.DEMO_MODE === 'true') {
			const demoWorkspace = db.select().from(workspaces).where(eq(workspaces.slug, 'demo')).get();
			if (demoWorkspace) {
				db.insert(workspaceMembers).values({ workspaceId: demoWorkspace.id, userId, role: 'member' }).run();
				const publicChannels = db.select().from(channels)
					.where(and(eq(channels.workspaceId, demoWorkspace.id), eq(channels.isPrivate, false), eq(channels.isDm, false)))
					.all();
				for (const ch of publicChannels) {
					db.insert(channelMembers).values({ channelId: ch.id, userId, role: 'member' }).run();
				}
				membership = { workspaceId: demoWorkspace.id };
			}
		}
		if (!membership) {
			if (env.DEMO_MODE === 'true') {
				// demo 워크스페이스가 없는 설정 오류 — setup으로 보내지 않음
				throw new Error('DEMO_MODE is enabled but no "demo" workspace exists. Run: npm run db:seed-sample');
			}
			redirect(302, '/setup');
		}
	}

	const workspace = db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, membership.workspaceId))
		.get();

	if (!workspace) redirect(302, '/setup');

	// Find first channel
	const firstChannel = db
		.select()
		.from(channels)
		.where(eq(channels.workspaceId, workspace.id))
		.get();

	if (!firstChannel) redirect(302, '/setup');

	redirect(302, `/${workspace.slug}/${firstChannel.id}`);
};
