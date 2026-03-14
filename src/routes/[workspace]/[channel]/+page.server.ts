import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { channels, messages, users, channelMembers } from '$lib/db/schema';
import { eq, desc, isNull, and, count, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { MessagePayload } from '$lib/ws/types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	const userId = session.user.id!;
	const channelId = event.params.channel;

	const channel = db.select().from(channels).where(eq(channels.id, channelId)).get();
	if (!channel) error(404, '채널을 찾을 수 없습니다.');

	// Private channel access check
	if (channel.isPrivate) {
		const membership = db.select().from(channelMembers)
			.where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
			.get();
		if (!membership) error(403, '이 채널에 접근 권한이 없습니다.');
	}

	// Load main messages (parentId IS NULL) with reply counts
	const rows = db
		.select({
			id: messages.id,
			channelId: messages.channelId,
			authorId: messages.authorId,
			authorName: users.name,
			authorAvatar: users.avatarUrl,
			body: messages.body,
			imageUrl: messages.imageUrl,
			createdAt: messages.createdAt,
		})
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(and(eq(messages.channelId, channelId), isNull(messages.parentId)))
		.orderBy(desc(messages.createdAt))
		.limit(50)
		.all()
		.reverse();

	// Get reply counts for loaded messages
	const msgIds = rows.map(r => r.id);
	const replyCounts = msgIds.length > 0
		? db.select({ parentId: messages.parentId, cnt: count() })
			.from(messages)
			.where(sql`${messages.parentId} IN (${sql.join(msgIds.map(id => sql`${id}`), sql`, `)})`)
			.groupBy(messages.parentId)
			.all()
		: [];
	const replyCountMap = new Map(replyCounts.map(r => [r.parentId, r.cnt]));

	const initialMessages: MessagePayload[] = rows.map((r) => ({
		id: r.id,
		channelId: r.channelId,
		authorId: r.authorId,
		authorName: r.authorName,
		authorAvatar: r.authorAvatar,
		body: r.body,
		imageUrl: r.imageUrl,
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
		replyCount: replyCountMap.get(r.id) ?? 0
	}));

	const parentData = await event.parent();

	// Check if current user is owner of this channel
	const myMembership = db.select().from(channelMembers)
		.where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
		.get();
	const isChannelOwner = myMembership?.role === 'owner';

	return {
		channel: { ...channel, isOwner: isChannelOwner },
		initialMessages,
		userId,
		members: parentData.members,
		channels: parentData.channels,
		workspace: parentData.workspace
	};
};
