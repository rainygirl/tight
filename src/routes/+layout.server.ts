import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

const REQUIRED_ENV: { key: string; label: string; hint: string }[] = [
	{
		key: 'AUTH_SECRET',
		label: 'AUTH_SECRET',
		hint: 'openssl rand -base64 32 명령으로 생성하세요.'
	},
	{
		key: 'GOOGLE_CLIENT_ID',
		label: 'GOOGLE_CLIENT_ID',
		hint: 'Google Cloud Console → OAuth 2.0 클라이언트 ID에서 발급받으세요.'
	},
	{
		key: 'GOOGLE_CLIENT_SECRET',
		label: 'GOOGLE_CLIENT_SECRET',
		hint: 'Google Cloud Console → OAuth 2.0 클라이언트 보안 비밀번호입니다.'
	}
];

export const load: LayoutServerLoad = async (event) => {
	// Check for missing required env vars first
	// $env/dynamic/private 는 SvelteKit이 .env를 직접 읽으므로 process.env보다 신뢰성이 높음
	const missing = REQUIRED_ENV.filter(({ key }) => !env[key]);
	if (missing.length > 0) {
		return { session: null, missingEnv: missing };
	}

	try {
		const session = await event.locals.auth();
		return { session };
	} catch (err) {
		// Auth config error (e.g. MissingSecret) — treat as env not configured
		const message = err instanceof Error ? err.message : String(err);
		return {
			session: null,
			missingEnv: [{ key: 'AUTH_SECRET', label: 'AUTH_SECRET', hint: message }]
		};
	}
};
