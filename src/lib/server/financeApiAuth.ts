/**
 * Token auth for the /finances overrides export. A caller presents a token
 * minted from the categorizer's token panel, either as
 * `Authorization: Bearer <token>` (idiomatic for a script) or `?token=<token>`
 * (convenient for a browser / curl). The token is looked up by an exact, indexed
 * match on a 192-bit random value — no per-byte comparison and no OIDC session.
 *
 * Mirrors src/lib/server/cospendApiAuth.ts (the cospend export uses the same
 * pattern).
 */
import { dbConnect } from '$utils/db';
import { FinanceApiToken, type IFinanceApiToken } from '$models/FinanceApiToken';

/** Pull the token from the Authorization: Bearer header or the ?token= query. */
export function extractFinanceApiToken(request: Request, url: URL): string | null {
	const header = request.headers.get('authorization') || '';
	const m = header.match(/^Bearer\s+(.+)$/i);
	if (m) return m[1].trim();
	return url.searchParams.get('token');
}

/** Resolve a request to its token document, or null if absent/invalid. On a hit
 *  the token's `lastUsedAt` is refreshed best-effort (never blocks the request). */
export async function verifyFinanceApiToken(
	request: Request,
	url: URL
): Promise<IFinanceApiToken | null> {
	const token = extractFinanceApiToken(request, url);
	if (!token) return null;

	await dbConnect();
	const doc = await FinanceApiToken.findOne({ token }).lean<IFinanceApiToken>();
	if (!doc) return null;

	FinanceApiToken.updateOne({ token }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
	return doc;
}
