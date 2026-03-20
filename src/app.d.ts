// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session } from "@auth/sveltekit";

declare global {
	namespace App {
		interface Error {
			message: string;
			details?: string;
			bibleQuote?: { text: string; reference: string } | null;
			lang?: string;
		}
		interface Locals {
			auth(): Promise<Session | null>;
			session?: Session | null;
		}
		// interface PageData {}
		interface PageState {
			paymentId?: string | null;
		}
		// interface Platform {}
	}
}

declare module "@auth/sveltekit" {
	interface Session {
		user?: {
			name?: string | null;
			email?: string | null;
			image?: string | null;
			nickname?: string;
			groups?: string[];
		};
	}
}

export {};
