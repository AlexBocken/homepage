/**
 * Authentik admin API client.
 *
 * This is the ONLY module that holds the Authentik service-account token. It is
 * server-only ($env/static/private) and must never be imported into client code.
 *
 * Authentik has no self-service write API: a user's own OIDC token cannot mutate
 * their profile. All writes go through admin-scoped endpoints. We therefore act
 * as a trusted proxy and — critically — every public caller resolves the acting
 * user's `pk` from the signed session via {@link requireSelf}, never from client
 * input. `patchUser` additionally hard-whitelists the writable fields.
 */
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { AUTHENTIK_ISSUER } from '$env/static/private';
// Runtime-only secret (not embedded in build) — read dynamically so dev/build
// don't require it to be present at compile time.
import { env } from '$env/dynamic/private';

// Issuer looks like https://sso.bocken.org/application/o/main/ — the API lives at
// the same origin under /api/v3.
const ORIGIN = new URL(AUTHENTIK_ISSUER).origin;
const API_BASE = ORIGIN + '/api/v3';

// Authentication flow used to verify a user's current password (slug of the
// flow with an identification + password stage). Override if yours differs.
const AUTH_FLOW_SLUG = env.AUTHENTIK_AUTH_FLOW_SLUG || 'default-authentication-flow';

export interface AuthentikUser {
	pk: number;
	username: string;
	name: string;
	email: string;
	is_active: boolean;
	date_joined: string;
	groups_obj?: { name: string }[];
	groups?: string[];
	attributes: Record<string, unknown>;
	avatar: string;
}

/** Writable subset of the user resource. Anything outside this is rejected.
 *  `email` is only ever set by the verified email-change flow. */
type PatchableUser = {
	name?: string;
	email?: string;
	is_active?: boolean;
	attributes?: Record<string, unknown>;
};

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
	return {
		Authorization: `Bearer ${env.AUTHENTIK_API_TOKEN}`,
		Accept: 'application/json',
		...extra
	};
}

async function expectOk(res: Response, context: string): Promise<void> {
	if (res.ok) return;
	let detail = '';
	try {
		detail = JSON.stringify(await res.json());
	} catch {
		/* body not JSON / empty */
	}
	console.error(`[Authentik] ${context} failed: ${res.status} ${res.statusText} ${detail}`);
	throw error(502, `Authentik request failed (${context}).`);
}

/**
 * Resolve a user's integer primary key from their username.
 *
 * We resolve by username (the OIDC `nickname`/`preferred_username` claim) rather
 * than the `sub` UUID: Authentik's `uuid` list filter is unreliable for OIDC
 * subs and the user API doesn't even return the uuid, whereas `username` is an
 * exact, unique, well-supported filter. The username comes from the signed
 * session, so a user can only ever resolve their own pk. Requires exactly one
 * match — 0 or >1 is a hard error, never guessed.
 */
export async function resolvePkByUsername(username: string): Promise<number> {
	const res = await fetch(`${API_BASE}/core/users/?username=${encodeURIComponent(username)}`, {
		headers: authHeaders()
	});
	await expectOk(res, 'resolvePkByUsername');
	const data = (await res.json()) as { results: { pk: number; username: string }[] };
	// `username` is an exact filter, but guard against any substring/`search`
	// behaviour by requiring an exact, unique match.
	const matches = (data.results ?? []).filter((u) => u.username === username);
	if (matches.length !== 1) {
		console.error(`[Authentik] resolvePkByUsername expected 1 exact match for "${username}", got ${matches.length}`);
		throw error(502, 'Could not resolve account.');
	}
	return matches[0].pk;
}

export async function getUser(pk: number): Promise<AuthentikUser> {
	const res = await fetch(`${API_BASE}/core/users/${pk}/`, { headers: authHeaders() });
	await expectOk(res, 'getUser');
	return (await res.json()) as AuthentikUser;
}

/**
 * PATCH a user, restricted to the whitelisted fields. Note that Authentik
 * replaces the whole `attributes` object on write, so callers that change a
 * single attribute must read-modify-write the full object (see avatar endpoint).
 */
export async function patchUser(pk: number, body: PatchableUser): Promise<void> {
	const allowed: PatchableUser = {};
	if (body.name !== undefined) allowed.name = body.name;
	if (body.email !== undefined) allowed.email = body.email;
	if (body.is_active !== undefined) allowed.is_active = body.is_active;
	if (body.attributes !== undefined) allowed.attributes = body.attributes;

	const res = await fetch(`${API_BASE}/core/users/${pk}/`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(allowed)
	});
	await expectOk(res, 'patchUser');
}

export async function setPassword(pk: number, password: string): Promise<void> {
	const res = await fetch(`${API_BASE}/core/users/${pk}/set_password/`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ password })
	});
	await expectOk(res, 'setPassword');
}

/**
 * Verify a user's CURRENT password by driving Authentik's authentication flow
 * via the Flow Executor API (the only way — Authentik has no "check password"
 * endpoint, and its OAuth password grant only authenticates service accounts).
 *
 * We submit the username + password stage-by-stage on a throwaway session (no
 * admin token). A wrong password makes Authentik re-present the credential stage
 * with errors → we return false. Advancing past the password stage (to success,
 * MFA, consent, etc.) means the password was accepted → true.
 *
 * Caveat: failed attempts count toward Authentik's login throttling, and this
 * assumes a flow with a standard identification/password stage (no captcha
 * before the password). Throws 501 if the flow shape is unsupported.
 */
export async function verifyPassword(username: string, password: string): Promise<boolean> {
	const url = `${ORIGIN}/api/v3/flows/executor/${AUTH_FLOW_SLUG}/?query=`;

	// Minimal cookie jar — the flow executor stores state in the session cookie,
	// which must be echoed back across requests.
	const jar = new Map<string, string>();
	const store = (res: Response) => {
		for (const sc of res.headers.getSetCookie?.() ?? []) {
			const pair = sc.split(';', 1)[0];
			const eq = pair.indexOf('=');
			if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
		}
	};
	const headers = (json = false): Record<string, string> => {
		const h: Record<string, string> = { Accept: 'application/json' };
		if (json) h['Content-Type'] = 'application/json';
		if (jar.size) h.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
		return h;
	};

	let res = await fetch(url, { headers: headers() });
	store(res);
	if (!res.ok) throw error(502, 'Authentik-Flow konnte nicht gestartet werden.');
	let data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

	let submittedPassword = false;
	for (let step = 0; step < 8; step++) {
		const component = data.component as string | undefined;

		// Outcome check after we've sent the password.
		if (submittedPassword) {
			// Re-presented credential stage = rejected; anything else = accepted.
			if (component === 'ak-stage-password' || component === 'ak-stage-identification') return false;
			return true;
		}

		if (component === 'ak-stage-identification') {
			const body: Record<string, string> = { uid_field: username };
			if (data.password_fields) {
				body.password = password; // combined identification+password stage
				submittedPassword = true;
			}
			res = await fetch(url, { method: 'POST', headers: headers(true), body: JSON.stringify(body) });
		} else if (component === 'ak-stage-password') {
			submittedPassword = true;
			res = await fetch(url, { method: 'POST', headers: headers(true), body: JSON.stringify({ password }) });
		} else {
			// Redirect/success before any password prompt, or a captcha/unknown stage.
			console.error('[Authentik] verifyPassword unsupported stage:', component);
			throw error(501, 'Passwortprüfung wird von der aktuellen Authentik-Flow-Konfiguration nicht unterstützt.');
		}

		store(res);
		if (res.status >= 500) throw error(502, 'Authentik-Flow-Fehler bei der Passwortprüfung.');
		data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	}
	return false;
}

export interface SelfIdentity {
	pk: number;
	nickname: string;
}

/**
 * Resolve the authenticated user's own Authentik identity for a request.
 * The `pk` is taken from the signed session (cached in the JWT by auth.ts) and
 * falls back to a live username lookup if the cache is cold. Throws 401 if there
 * is no usable session. Callers must use the returned `pk` and never accept a
 * client-supplied id.
 */
export async function requireSelf(locals: RequestEvent['locals']): Promise<SelfIdentity> {
	const session = locals.session ?? (await locals.auth());
	const user = session?.user;
	if (!user?.nickname) {
		throw error(401, 'Unauthorized');
	}
	const pk = typeof user.pk === 'number' ? user.pk : await resolvePkByUsername(user.nickname);
	return { pk, nickname: user.nickname };
}
