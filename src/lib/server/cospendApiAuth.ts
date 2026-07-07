/**
 * Token auth for the cospend export API. A caller presents a token minted from
 * the cospend settings panel, either as `Authorization: Bearer <token>` (the
 * idiomatic form for a script) or `?token=<token>` (convenient for a browser /
 * curl). The token is looked up by an exact, indexed match on a 192-bit random
 * value — no per-byte comparison is needed and no OIDC session is involved.
 *
 * Mirrors the DB-backed token pattern used by the period-calendar ICS feed
 * (src/lib/server/periodIcsFeed.ts) and shopping share tokens.
 */
import { dbConnect } from '$utils/db';
import { CospendApiToken, type ICospendApiToken } from '$models/CospendApiToken';

/** Pull the token from the Authorization: Bearer header or the ?token= query. */
export function extractCospendApiToken(request: Request, url: URL): string | null {
	const header = request.headers.get('authorization') || '';
	const m = header.match(/^Bearer\s+(.+)$/i);
	if (m) return m[1].trim();
	return url.searchParams.get('token');
}

/** Resolve a request to its token document, or null if absent/invalid. On a hit
 *  the token's `lastUsedAt` is refreshed best-effort (never blocks the request). */
export async function verifyCospendApiToken(
	request: Request,
	url: URL
): Promise<ICospendApiToken | null> {
	const token = extractCospendApiToken(request, url);
	if (!token) return null;

	await dbConnect();
	const doc = await CospendApiToken.findOne({ token }).lean<ICospendApiToken>();
	if (!doc) return null;

	CospendApiToken.updateOne({ token }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
	return doc;
}
