import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Only allow same-origin relative paths as a post-auth redirect target.
 *  Anything external (`//evil`, `http:…`) is dropped to `/`. Guards against
 *  open redirect via the `callbackUrl` query param. The value is sent to
 *  Auth.js in a URL-encoded body, so no HTML escaping is needed here. */
function safeCallbackUrl(raw: string | null): string {
	return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

/** Kick off the Authentik OIDC flow entirely server-side and 302 the browser
 *  straight to the provider — no intermediate HTML page and no client-side
 *  form auto-submit (which briefly painted a blank styled page and cost an
 *  extra client→server round trip before the redirect).
 *
 *  We replay what the auto-submitting form did, but in-process: POST the
 *  Auth.js sign-in endpoint via `event.fetch` (SvelteKit routes this through
 *  the auth `handle` hook). Auth.js answers with a 302 to Authentik plus the
 *  short-lived state/PKCE/nonce cookies; SvelteKit's internal-fetch machinery
 *  forwards those `Set-Cookie`s onto our own response automatically, so we only
 *  need to relay the `Location`.
 *
 *  Notes:
 *  - `@auth/sveltekit` runs Auth.js with `skipCSRFCheck`, so no CSRF token is
 *    required on the sign-in POST.
 *  - The explicit `origin` header satisfies SvelteKit's own cross-site form
 *    protection for the internal POST (a form-encoded body with no Origin would
 *    be rejected with 403 in production). */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const callbackUrl = safeCallbackUrl(url.searchParams.get('callbackUrl'));

	const res = await fetch('/auth/signin/authentik', {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			origin: url.origin
		},
		body: new URLSearchParams({ callbackUrl }),
		redirect: 'manual'
	});

	const location = res.headers.get('location');
	if (!location) {
		error(502, 'Login konnte nicht gestartet werden.');
	}

	redirect(302, location);
};
