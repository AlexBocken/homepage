/**
 * Token auth for the read-only export APIs (cospend ledger, finances
 * overrides). A caller presents a token minted from the matching settings
 * panel, either as `Authorization: Bearer <token>` (the idiomatic form for a
 * script) or `?token=<token>` (convenient for a browser / curl). The token is
 * looked up by an exact, indexed match on a 192-bit random value — no per-byte
 * comparison is needed and no OIDC session is involved.
 *
 * Mirrors the DB-backed token pattern used by the period-calendar ICS feed
 * (src/lib/server/periodIcsFeed.ts) and shopping share tokens.
 */
import { dbConnect } from '$utils/db';
import type { ApiTokenModel, IApiToken } from '$models/apiToken';

/** Pull the token from the Authorization: Bearer header or the ?token= query.
 *  The header wins when both are present. */
export function extractApiToken(request: Request, url: URL): string | null {
	const header = request.headers.get('authorization') || '';
	const m = header.match(/^Bearer\s+(.+)$/i);
	if (m) return m[1].trim();
	return url.searchParams.get('token');
}

/** A verifier bound to one token collection: resolves a request to its token
 *  document, or null if absent/invalid. On a hit the token's `lastUsedAt` is
 *  refreshed best-effort (never blocks the request). */
export function createApiTokenAuth(model: ApiTokenModel) {
	return async function verify(request: Request, url: URL): Promise<IApiToken | null> {
		const token = extractApiToken(request, url);
		if (!token) return null;

		await dbConnect();
		const doc = await model.findOne({ token }).lean<IApiToken>();
		if (!doc) return null;

		model.updateOne({ token }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
		return doc;
	};
}
