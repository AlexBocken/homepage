import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Map the page the user was on to the nearest route that still renders while
 *  logged out, so signing out of a protected area doesn't dump you on a page
 *  that immediately bounces to /login.
 *
 *  Rule (kept deliberately simple): the recipe section is public at its root,
 *  so stay within it (`/recipes` or `/rezepte`); everything else — every other
 *  protected area (fitness, finances, cospend, settings, …) and any public page
 *  — goes home. `raw` is the `callbackUrl` query param (the pre-logout path);
 *  anything external/malformed is treated as home. */
function safeLogoutDestination(raw: string | null): string {
	const path = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
	if (path === '/recipes' || path.startsWith('/recipes/')) return '/recipes';
	if (path === '/rezepte' || path.startsWith('/rezepte/')) return '/rezepte';
	return '/';
}

/** Sign out entirely server-side and 302 to a safe destination — no intermediate
 *  styled HTML page and no client-side form auto-submit (which briefly flashed a
 *  blank page and cost an extra round trip). Mirrors the `/login` handler: POST
 *  the Auth.js sign-out endpoint via `event.fetch` (routed through the auth
 *  `handle` hook), which clears the session cookie and answers with a 302 to our
 *  `callbackUrl`; SvelteKit forwards the cookie-clearing `Set-Cookie` onto our
 *  own response automatically.
 *
 *  This is a local sign-out only (the Authentik SSO session is left intact, as
 *  before) so a subsequent login is seamless.
 *
 *  Notes:
 *  - `@auth/sveltekit` runs Auth.js with `skipCSRFCheck`, so no CSRF token is
 *    needed on the sign-out POST.
 *  - The explicit `origin` header satisfies SvelteKit's own cross-site form
 *    protection for the internal POST. */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const destination = safeLogoutDestination(url.searchParams.get('callbackUrl'));

	const res = await fetch('/auth/signout', {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			origin: url.origin
		},
		body: new URLSearchParams({ callbackUrl: destination }),
		redirect: 'manual'
	});

	redirect(302, res.headers.get('location') ?? destination);
};
