import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw error(401);

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
	if (typeof body.bio === 'string') updates.bio = body.bio;
	if (typeof body.roleTitle === 'string') updates.roleTitle = body.roleTitle;
	if (typeof body.phone === 'string') updates.phone = body.phone;
	if (typeof body.avatarUrl === 'string') updates.avatarUrl = body.avatarUrl;
	if (typeof body.avatarSource === 'string') updates.avatarSource = body.avatarSource;

	if (Object.keys(updates).length === 0) return json({ ok: true });

	db.update(users).set(updates).where(eq(users.id, session.user.id)).run();
	return json({ ok: true });
};
