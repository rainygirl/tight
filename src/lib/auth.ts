import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { env } from '$env/dynamic/private';
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env;
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { uploadAvatarToR2 } from '$lib/r2';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET
		})
	],
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider !== 'google' || !user.email) {
				return false;
			}

			const id = user.id ?? account.providerAccountId;
			if (!id) return false;

			try {
				// id 또는 email로 조회 — 어느 쪽으로든 이미 존재하면 삽입 건너뜀
				const existing =
					db.select().from(users).where(eq(users.id, id)).get() ??
					db.select().from(users).where(eq(users.email, user.email)).get();

				if (!existing) {
					const avatarUrl = user.image ? await uploadAvatarToR2(user.image) : null;
					db.insert(users)
						.values({
							id,
							email: user.email,
							name: user.name ?? user.email,
							avatarUrl,
							avatarSource: 'google',
							createdAt: new Date()
						})
						.run();
				} else if (existing.avatarSource !== 'custom' && existing.avatarUrl?.includes('googleusercontent.com')) {
					const avatarUrl = user.image ? await uploadAvatarToR2(user.image) : existing.avatarUrl;
					db.update(users).set({ avatarUrl }).where(eq(users.id, existing.id)).run();
				}
			} catch (err) {
				console.error('[auth] signIn DB error:', err);
			}
			return true;
		},
		async jwt({ token, account }) {
			// 최초 로그인 시(account 존재) signIn 콜백이 DB에 저장한 실제 id를 token에 고정
			if (account && token.email) {
				const dbUser = db.select().from(users).where(eq(users.email, token.email)).get();
				if (dbUser) token.sub = dbUser.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.sub) {
				session.user.id = token.sub;
			}
			return session;
		}
	},
	trustHost: true
});
