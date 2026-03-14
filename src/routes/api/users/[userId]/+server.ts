import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) throw error(401);

	const user = db.select().from(users).where(eq(users.id, params.userId)).get();
	if (!user) throw error(404);

	return json({
		id: user.id,
		name: user.name,
		email: user.email,
		avatarUrl: user.avatarUrl,
		bio: user.bio,
		roleTitle: user.roleTitle,
		phone: user.phone,
	});
};
