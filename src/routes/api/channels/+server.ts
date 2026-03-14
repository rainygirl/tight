import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { channels, channelMembers, workspaceMembers } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function nanoid() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const userId = session.user.id!;
	const { workspaceId, name, isPrivate = false } = await request.json();

	const membership = db
		.select()
		.from(workspaceMembers)
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
		.get();

	if (!membership) error(403, 'Forbidden');
	if (!name?.trim()) error(400, '채널 이름이 필요합니다.');

	const id = nanoid();
	db.insert(channels)
		.values({ id, workspaceId, name: name.trim().toLowerCase(), isPrivate: !!isPrivate, createdAt: new Date() })
		.run();

	// Creator becomes owner
	db.insert(channelMembers).values({ channelId: id, userId, role: 'owner' }).run();

	// For public channels, add all workspace members
	if (!isPrivate) {
		const allMembers = db
			.select({ userId: workspaceMembers.userId })
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspaceId))
			.all();
		for (const m of allMembers) {
			if (m.userId === userId) continue;
			try {
				db.insert(channelMembers).values({ channelId: id, userId: m.userId, role: 'member' }).run();
			} catch { /* ignore duplicate */ }
		}
	}

	const channel = db.select().from(channels).where(eq(channels.id, id)).get();
	return json(channel, { status: 201 });
};
