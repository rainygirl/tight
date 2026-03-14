import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { channels, channelMembers, messages, users } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { MessagePayload } from '$lib/ws/types';

function nanoid() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	const myId = session.user.id!;
	const otherId = event.params.userId;
	const parentData = await event.parent();
	const workspace = parentData.workspace;


	const otherUser = db.select().from(users).where(eq(users.id, otherId)).get();
	if (!otherUser) error(404, '사용자를 찾을 수 없습니다.');

	// DM 채널명: dm:작은id:큰id (정렬해서 항상 동일한 채널)
	const dmName = 'dm:' + [myId, otherId].sort().join(':');

	let channel = db
		.select()
		.from(channels)
		.where(and(eq(channels.workspaceId, workspace.id), eq(channels.name, dmName)))
		.get();

	if (!channel) {
		const id = nanoid();
		db.insert(channels)
			.values({ id, workspaceId: workspace.id, name: dmName, isDm: true, createdAt: new Date() })
			.run();
		const members = myId === otherId
			? [{ channelId: id, userId: myId }]
			: [{ channelId: id, userId: myId }, { channelId: id, userId: otherId }];
		db.insert(channelMembers).values(members).run();
		channel = db.select().from(channels).where(eq(channels.id, id)).get()!;
	}

	const rows = db
		.select({
			id: messages.id,
			channelId: messages.channelId,
			authorId: messages.authorId,
			authorName: users.name,
			authorAvatar: users.avatarUrl,
			body: messages.body,
			imageUrl: messages.imageUrl,
			createdAt: messages.createdAt
		})
		.from(messages)
		.innerJoin(users, eq(messages.authorId, users.id))
		.where(eq(messages.channelId, channel.id))
		.orderBy(messages.createdAt)
		.limit(50)
		.all();

	const initialMessages: MessagePayload[] = rows.map((r) => ({
		id: r.id,
		channelId: r.channelId,
		authorId: r.authorId,
		authorName: r.authorName,
		authorAvatar: r.authorAvatar,
		body: r.body,
		imageUrl: r.imageUrl,
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)
	}));

	return {
		channel,
		otherUser,
		initialMessages,
		userId: myId,
		channels: parentData.channels,
		members: parentData.members
	};
};
