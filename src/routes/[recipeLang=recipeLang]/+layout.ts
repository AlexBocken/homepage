import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

/** Universal load. Lives outside `+layout.server.ts` so the entire `[recipeLang]`
 *  group can render without a `__data.json` round-trip — critical for offline:
 *  if SvelteKit can't reach the network for the layout's server data, it errors
 *  before the page-level offline fallback ever runs. Session is fetched from
 *  the Auth.js `/auth/session` endpoint and gracefully nulled when offline.
 */
export const load: LayoutLoad = async ({ params, fetch }) => {
	// recipeLang param matcher already restricts to 'rezepte'/'recipes'
	const lang: 'en' | 'de' = params.recipeLang === 'recipes' ? 'en' : 'de';
	const isClientOffline = browser && !navigator.onLine;

	let session: { user?: unknown; expires?: string } | null = null;
	if (!isClientOffline) {
		try {
			const res = await fetch('/auth/session');
			if (res.ok) {
				const body = await res.json();
				session = body && (body.user || body.expires) ? body : null;
			}
		} catch {
			// Auth endpoint unreachable — proceed as logged out
		}
	}

	return {
		session,
		lang,
		recipeLang: params.recipeLang,
		isOffline: isClientOffline
	};
};
