import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { requireSelf } from '$lib/server/authentik';
// Read at runtime rather than inlined via $env/static/private: the bridge is
// optional infrastructure, and a missing key here must not fail the build for a
// checkout (or an e2e run) that has no Anki sync server.
import { env } from '$env/dynamic/private';

const ANKI_GROUP = 'anki_users';
const TIMEOUT_MS = 3000;

/**
 * Provisioning state of the caller's Anki sync account, for the settings card.
 *
 * Login-only rather than group-gated on purpose: someone without `anki_users`
 * still needs the card to render so it can point them at the group-request
 * form. The bridge itself is the enforcement point — this endpoint reveals
 * nothing but the caller's own state.
 *
 * The username is taken from the signed session, never from a query parameter,
 * so one user can never ask about another.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { nickname } = await requireSelf(locals);

	const base = (env.ANKI_BRIDGE_URL || 'http://127.0.0.1:8092').replace(/\/+$/, '');
	const token = env.ANKI_BRIDGE_TOKEN ?? '';
	const publicUrl = env.ANKI_SYNC_PUBLIC_URL ?? '';

	const session = await locals.auth();
	const hasGroup = (session?.user?.groups ?? []).includes(ANKI_GROUP);

	// The card must render even when the bridge is down or not deployed at all,
	// so an unreachable sidecar is a normal outcome here, not an error.
	let bridge: Record<string, unknown> | null = null;
	try {
		const res = await fetch(`${base}/internal/status?username=${encodeURIComponent(nickname)}`, {
			headers: { 'x-bridge-token': token, accept: 'application/json' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (res.ok) bridge = await res.json();
		else console.error('anki-bridge status error:', res.status);
	} catch (err) {
		console.error('anki-bridge unreachable:', err);
	}

	return json({
		available: bridge !== null,
		hasGroup,
		username: nickname,
		syncUrl: (bridge?.sync_url as string) || publicUrl,
		provisioned: bridge?.provisioned === true,
		lastSeen: (bridge?.last_seen as string | null) ?? null,
		collectionBytes: typeof bridge?.collection_bytes === 'number' ? bridge.collection_bytes : 0
	});
};
