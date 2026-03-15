import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from '$lib/auth';
import { env } from '$env/dynamic/private';
import { encode } from '@auth/core/jwt';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import type { Handle } from '@sveltejs/kit';

const demoHandle: Handle = async ({ event, resolve }) => {
	if (env.DEMO_MODE !== 'true') return resolve(event);

	const isSecure = event.url.protocol === 'https:';
	const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';

	if (!event.cookies.get(cookieName) && env.AUTH_SECRET) {
		const allUsers = db
			.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
			.from(users)
			.all();

		if (allUsers.length > 0) {
			const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
			const token = await encode({
				token: {
					sub: randomUser.id,
					name: randomUser.name,
					email: randomUser.email,
					picture: randomUser.avatarUrl
				},
				secret: env.AUTH_SECRET,
				salt: cookieName
			});
			event.cookies.set(cookieName, token, {
				path: '/',
				httpOnly: true,
				secure: isSecure,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			});
		}
	}

	return resolve(event);
};

export const handle = sequence(demoHandle, authHandle);
