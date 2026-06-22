/**
 * Stateless share tokens for a run's static map image.
 *
 * The in-app history serves the image behind session ownership. For an
 * external/OG/share context (no session cookie), a per-session HMAC token
 * grants read access to that one run's map image and nothing else. Stateless
 * (no DB row): the token is an HMAC of the session id under AUTH_SECRET, so it
 * stays valid as long as the secret does and can't be forged or transferred to
 * another session id.
 */
import crypto from 'node:crypto';
import { AUTH_SECRET } from '$env/static/private';

function sign(sessionId: string): string {
	return crypto
		.createHmac('sha256', AUTH_SECRET)
		.update(`runmap:${sessionId}`)
		.digest('base64url');
}

/** Mint a share token for a session's map image. */
export function runMapToken(sessionId: string): string {
	return sign(sessionId);
}

/** Constant-time check that `token` authorizes this session's map image. */
export function verifyRunMapToken(sessionId: string, token: string | null): boolean {
	if (!token) return false;
	const expected = sign(sessionId);
	const a = Buffer.from(token);
	const b = Buffer.from(expected);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}
