import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { workspaces, workspaceMembers, channels, channelMembers, users } from '$lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	const userId = session.user.id!;
	const slug = event.params.workspace;

	const workspace = db.select().from(workspaces).where(eq(workspaces.slug, slug)).get();
	if (!workspace) error(404, '워크스페이스를 찾을 수 없습니다.');

	const membership = db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, userId)))
		.get();
	if (!membership) error(403, '워크스페이스에 접근 권한이 없습니다.');

	// All non-DM channels
	const allChannels = db
		.select()
		.from(channels)
		.where(and(eq(channels.workspaceId, workspace.id), eq(channels.isDm, false)))
		.all();

	// User's channel memberships
	const myChannelIds = new Set(
		db.select({ channelId: channelMembers.channelId })
			.from(channelMembers)
			.where(eq(channelMembers.userId, userId))
			.all()
			.map(r => r.channelId)
	);

	// Channel owner info
	const ownerRows = db
		.select({ channelId: channelMembers.channelId, userId: channelMembers.userId })
		.from(channelMembers)
		.where(eq(channelMembers.role, 'owner'))
		.all();
	const channelOwners = new Map(ownerRows.map(r => [r.channelId, r.userId]));

	// Filter: public always visible, private only if member
	const workspaceChannels = allChannels
		.filter(ch => !ch.isPrivate || myChannelIds.has(ch.id))
		.map(ch => ({
			...ch,
			isOwner: channelOwners.get(ch.id) === userId
		}));

	// DM 채널 — 상대방 유저 정보와 함께
	const myDmChannels = db
		.select({ channelId: channelMembers.channelId })
		.from(channelMembers)
		.innerJoin(channels, eq(channelMembers.channelId, channels.id))
		.where(
			and(
				eq(channelMembers.userId, userId),
				eq(channels.workspaceId, workspace.id),
				eq(channels.isDm, true)
			)
		)
		.all();

	const dms = myDmChannels
		.map(({ channelId }) => {
			const other = db
				.select({ userId: channelMembers.userId })
				.from(channelMembers)
				.where(and(eq(channelMembers.channelId, channelId), ne(channelMembers.userId, userId)))
				.get();
			const otherId = other?.userId ?? userId;
			const otherUser = db.select().from(users).where(eq(users.id, otherId)).get();
			if (!otherUser) return null;
			return { channelId, user: otherUser };
		})
		.filter(Boolean) as { channelId: string; user: typeof users.$inferSelect }[];

	// 워크스페이스 멤버 (@ 멘션용)
	const members = db
		.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
		.from(workspaceMembers)
		.innerJoin(users, eq(workspaceMembers.userId, users.id))
		.where(eq(workspaceMembers.workspaceId, workspace.id))
		.all();

	return {
		workspace,
		channels: workspaceChannels,
		dms,
		members,
		userId,
		user: session.user
	};
};
