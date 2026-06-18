import type { RequestHandler } from './$types';

/**
 * Subrequest target for nginx's `auth_request` guarding the `/static/cospend/`
 * directory, so receipt images carry the SAME access rule as the rest of cospend
 * — not merely "logged in", but membership in the `cospend` group.
 *
 * This is enforced twice, on purpose:
 *  1. `hooks.server.ts` already gates every `/api/cospend/*` path (this route
 *     included): no session → 401, not in the `cospend` group → 403. So the
 *     subrequest can only reach here when the cospend rule already passed.
 *  2. The explicit check below states the requirement at the endpoint itself, so
 *     it stays correct even if the hook's path matching changes.
 *
 * Returns no body — nginx serves the static bytes itself when allowed, and treats
 * 401/403 as deny. nginx forwards the original Cookie header to this subrequest.
 *
 * Example nginx config (gate the whole directory, keep the URL):
 *
 *   location /static/cospend/ {
 *       auth_request /__cospend_auth;
 *       alias /var/www/static/cospend/;
 *   }
 *   location = /__cospend_auth {
 *       internal;
 *       proxy_pass http://127.0.0.1:3000/api/cospend/receipt-auth;
 *       proxy_pass_request_body off;
 *       proxy_set_header Content-Length "";
 *   }
 */
export const GET: RequestHandler = async ({ locals }) => {
	const session = locals.session ?? (await locals.auth());
	const allowed = !!session?.user?.groups?.includes('cospend');
	return new Response(null, { status: allowed ? 200 : 403 });
};
