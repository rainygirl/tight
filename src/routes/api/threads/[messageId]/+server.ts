import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { messages, users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { MessagePayload } from '$lib/ws/types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const { messageId } = params;

	// Original message
	const orig = db
		.select({
			id: messages.id, channelId: messages.channelId, authorId: messages.authorId,
			authorName: users.name, authorAvatar: users.avatarUrl,
			body: messages.body, imageUrl: messages.imageUrl, createdAt: messages.createdAt
		})
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(eq(messages.id, messageId))
		.get();

	if (!orig) error(404, '메시지를 찾을 수 없습니다.');

	// Replies
	const replyRows = db
		.select({
			id: messages.id, channelId: messages.channelId, authorId: messages.authorId,
			authorName: users.name, authorAvatar: users.avatarUrl,
			body: messages.body, imageUrl: messages.imageUrl, createdAt: messages.createdAt
		})
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(eq(messages.parentId, messageId))
		.orderBy(messages.createdAt)
		.all();

	const toPayload = (r: typeof orig): MessagePayload => ({
		id: r.id, channelId: r.channelId, authorId: r.authorId,
		authorName: r.authorName, authorAvatar: r.authorAvatar,
		body: r.body, imageUrl: r.imageUrl,
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)
	});

	return json({ original: toPayload(orig), replies: replyRows.map(toPayload) });
};
