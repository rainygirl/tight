import type { Session } from '@auth/sveltekit';

declare global {
	namespace App {
		interface Locals {
			auth: () => Promise<Session | null>;
		}
		interface PageData {
			session?: Session | null;
			missingEnv?: { key: string; label: string; hint: string }[];
		}
	}
}

export {};
