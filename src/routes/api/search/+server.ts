import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { messages, channels, users, channelMembers, workspaceMembers } from '$lib/db/schema';
import { eq, and, like, isNull, inArray, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');
	const userId = session.user.id!;

	const workspaceId = url.searchParams.get('workspaceId');
	const q = url.searchParams.get('q')?.trim();
	if (!workspaceId || !q || q.length < 1) return json([]);

	const membership = db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
		.get();
	if (!membership) error(403, 'Forbidden');

	const memberChannelIds = db
		.select({ channelId: channelMembers.channelId })
		.from(channelMembers)
		.innerJoin(channels, eq(channelMembers.channelId, channels.id))
		.where(and(eq(channelMembers.userId, userId), eq(channels.workspaceId, workspaceId)))
		.all()
		.map(r => r.channelId);

	if (memberChannelIds.length === 0) return json([]);

	const results = db
		.select({
			id: messages.id,
			body: messages.body,
			channelId: messages.channelId,
			channelName: channels.name,
			channelIsDm: channels.isDm,
			authorName: users.name,
			authorAvatar: users.avatarUrl,
			createdAt: messages.createdAt
		})
		.from(messages)
		.innerJoin(channels, eq(messages.channelId, channels.id))
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(
			and(
				like(messages.body, `%${q}%`),
				isNull(messages.parentId),
				inArray(messages.channelId, memberChannelIds)
			)
		)
		.orderBy(desc(messages.createdAt))
		.limit(20)
		.all();

	return json(results);
};
