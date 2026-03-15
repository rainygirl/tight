import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { users, workspaces, workspaceMembers, channels, channelMembers } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { uploadAvatarToR2 } from '$lib/r2';

function nanoid() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function slugify(str: string) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9가-힣]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	if (env.DEMO_MODE === 'true') redirect(302, '/');

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) redirect(302, '/login');

		const userId = session.user.id!;
		const data = await event.request.formData();
		const name = (data.get('name') as string)?.trim();

		if (!name || name.length < 2) {
			return fail(400, { error: '워크스페이스 이름은 2자 이상이어야 합니다.' });
		}

		const slug = slugify(name) || nanoid();
		const workspaceId = nanoid();
		const generalId = nanoid();
		const randomId = nanoid();

		try {
			// id 또는 email로 기존 사용자 조회 (id/token 불일치 대응)
			let dbUser =
				db.select().from(users).where(eq(users.id, userId)).get() ??
				db.select().from(users).where(eq(users.email, session.user.email!)).get();

			if (!dbUser) {
				const avatarUrl = session.user.image ? await uploadAvatarToR2(session.user.image) : null;
				db.insert(users)
					.values({
						id: userId,
						email: session.user.email!,
						name: session.user.name ?? session.user.email!,
						avatarUrl,
						createdAt: new Date()
					})
					.run();
				dbUser = db.select().from(users).where(eq(users.id, userId)).get()!;
			} else if (dbUser.avatarUrl?.includes('googleusercontent.com')) {
				const avatarUrl = session.user.image ? await uploadAvatarToR2(session.user.image) : dbUser.avatarUrl;
				db.update(users).set({ avatarUrl }).where(eq(users.id, dbUser.id)).run();
			}

			// 실제 DB의 userId 사용 (session.user.id와 다를 수 있음)
			const resolvedUserId = dbUser.id;

			db.insert(workspaces)
				.values({ id: workspaceId, name, slug, ownerId: resolvedUserId, createdAt: new Date() })
				.run();

			db.insert(workspaceMembers)
				.values({ workspaceId, userId: resolvedUserId, role: 'owner' })
				.run();

			db.insert(channels)
				.values([
					{ id: generalId, workspaceId, name: 'general', createdAt: new Date() },
					{ id: randomId, workspaceId, name: 'random', createdAt: new Date() }
				])
				.run();

			db.insert(channelMembers)
				.values([
					{ channelId: generalId, userId: resolvedUserId },
					{ channelId: randomId, userId: resolvedUserId }
				])
				.run();
		} catch (err) {
			console.error('[setup] workspace creation failed:', err);
			const message = err instanceof Error ? err.message : String(err);
			return fail(500, { error: `워크스페이스 생성에 실패했습니다: ${message}` });
		}

		redirect(302, `/${slug}/${generalId}`);
	}
};
