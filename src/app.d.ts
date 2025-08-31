// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session } from "@auth/sveltekit";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth(): Promise<Session | null>;
		}
		// interface PageData {}
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
