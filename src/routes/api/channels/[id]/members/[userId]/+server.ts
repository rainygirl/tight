import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { channelMembers } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const myId = session.user.id!;
	const { id: channelId, userId } = params;

	// Must be owner, or removing yourself
	const myMembership = db
		.select()
		.from(channelMembers)
		.where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, myId)))
		.get();

	if (!myMembership) error(403, '권한이 없습니다.');
	if (myMembership.role !== 'owner' && myId !== userId) error(403, '권한이 없습니다.');
	if (myMembership.role === 'owner' && myId === userId) error(400, '오너는 채널을 나갈 수 없습니다.');

	db.delete(channelMembers)
		.where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
		.run();

	return json({ ok: true });
};
