import { db } from '$lib/db';
import { messages, users } from '$lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { broadcast, channelRooms } from './server.js';
import type { WebSocket } from 'ws';
import type { MessagePayload } from './types.js';

function nanoid() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function dispatch(
	msg: Record<string, unknown>,
	ws: WebSocket
): Promise<{ channelId?: string } | void> {
	switch (msg.type) {
		case 'join_channel': {
			const channelId = msg.channelId as string;
			if (!channelRooms.has(channelId)) channelRooms.set(channelId, new Set());
			channelRooms.get(channelId)!.add(ws);
			return { channelId };
		}

		case 'send_message': {
			const { channelId, body, imageUrl, authorId, parentId } = msg as {
				channelId: string;
				body: string;
				imageUrl?: string;
				authorId: string;
				parentId?: string;
			};

			if (!body?.trim() && !imageUrl) return;

			const author = db.select().from(users).where(eq(users.id, authorId)).get();
			if (!author) return;

			const id = nanoid();
			const now = new Date();

			db.insert(messages)
				.values({
					id,
					channelId,
					authorId,
					body: body.trim(),
					imageUrl: imageUrl ?? null,
					parentId: parentId ?? null,
					createdAt: now
				})
				.run();

			const payload: MessagePayload = {
				id,
				channelId,
				authorId,
				authorName: author.name,
				authorAvatar: author.avatarUrl,
				body: body.trim(),
				imageUrl: imageUrl ?? null,
				createdAt: now.toISOString()
			};

			if (parentId) {
				// Thread reply: broadcast to thread room
				const threadRoom = `thread:${parentId}`;
				broadcast(threadRoom, { type: 'new_message', message: payload });

				// Broadcast reply count update to channel room
				const [{ value: replyCount }] = db
					.select({ value: count() })
					.from(messages)
					.where(eq(messages.parentId, parentId))
					.all();
				broadcast(channelId, { type: 'new_reply', parentId, reply: payload, replyCount });
			} else {
				broadcast(channelId, { type: 'new_message', message: payload });
			}
			return;
		}

		case 'typing': {
			const { channelId, userId, isTyping } = msg as {
				channelId: string;
				userId: string;
				isTyping: boolean;
			};
			broadcast(channelId, { type: 'typing', userId, isTyping }, ws);
			return;
		}
	}
}
