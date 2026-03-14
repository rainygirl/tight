import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { workspaces, workspaceMembers, channels } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user) redirect(302, '/login');

	const userId = session.user.id!;

	// Find first workspace the user belongs to
	const membership = db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, userId))
		.get();

	if (!membership) {
		// No workspace: redirect to setup
		redirect(302, '/setup');
	}

	const workspace = db
		.select()
		.from(workspaces)
		.where(eq(workspaces.id, membership.workspaceId))
		.get();

	if (!workspace) redirect(302, '/setup');

	// Find first channel
	const firstChannel = db
		.select()
		.from(channels)
		.where(eq(channels.workspaceId, workspace.id))
		.get();

	if (!firstChannel) redirect(302, '/setup');

	redirect(302, `/${workspace.slug}/${firstChannel.id}`);
};
