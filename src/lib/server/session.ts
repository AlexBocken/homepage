import type { Session } from '@auth/sveltekit';

/**
 * Strip server-only identifiers — the Authentik integer `pk` and the OIDC
 * `sub` (uuid) — from a session before it is serialized into page data for the
 * client. They are only needed server-side (`requireSelf` reads them from
 * `locals.session`), and other Authentik-connected services rely on them, so we
 * keep them on the session itself and merely avoid shipping them to the browser.
 */
export function clientSession(session: Session | null): Session | null {
	if (!session?.user) return session;
	const user = { ...session.user };
	delete user.pk;
	delete user.sub;
	return { ...session, user };
}
