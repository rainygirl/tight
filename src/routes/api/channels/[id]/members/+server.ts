import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { channelMembers, users } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET — list members of a channel
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const channelId = params.id;
	const rows = db
		.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, role: channelMembers.role })
		.from(channelMembers)
		.innerJoin(users, eq(channelMembers.userId, users.id))
		.where(eq(channelMembers.channelId, channelId))
		.all();

	return json(rows);
};

// POST — invite a member
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const myId = session.user.id!;
	const channelId = params.id;
	const { userId } = await request.json();

	// Check requester is owner
	const myMembership = db
		.select()
		.from(channelMembers)
		.where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, myId)))
		.get();
	if (!myMembership || myMembership.role !== 'owner') error(403, '권한이 없습니다.');

	try {
		db.insert(channelMembers).values({ channelId, userId, role: 'member' }).run();
	} catch {
		error(409, '이미 멤버입니다.');
	}

	const user = db.select().from(users).where(eq(users.id, userId)).get();
	return json(user, { status: 201 });
};
