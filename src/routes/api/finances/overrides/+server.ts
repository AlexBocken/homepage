import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { listOverrides, upsertOverride, OVERRIDE_FIELDS } from '$lib/server/financeOverrides';

// The /finances categorizer's store. Owner-only, like the rest of /api/finances
// (hooks.server.ts gates the whole tree on nickname === 'alexander'); the check
// here is defence-in-depth. This specific route takes precedence over the
// /api/finances/[...path] sidecar proxy.
const OWNER = 'alexander';

async function requireOwner(locals: App.Locals) {
	const user = await requireAuth(locals);
	if (user.nickname?.toLowerCase() !== OWNER) throw error(403, 'Forbidden');
	return user;
}

/** GET: every stored override (so the UI can show which txns are already tagged). */
export const GET: RequestHandler = async ({ locals }) => {
	await requireOwner(locals);
	return json({ overrides: await listOverrides() });
};

/**
 * POST: upsert one assignment. Body is a full overrides row
 * `{ key, account, date, amount, payee, narration }`; an empty `account` clears
 * a previous choice. `key`/`date`/`amount` come verbatim from finance-service so
 * the stored row matches the ledger repo's own key computation.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	await requireOwner(locals);
	const body = await request.json().catch(() => ({}));
	if (typeof body.key !== 'string' || !body.key.trim()) {
		throw error(400, 'key is required');
	}
	const row = Object.fromEntries(
		OVERRIDE_FIELDS.map((f) => [f, typeof body[f] === 'string' ? body[f] : ''])
	) as Record<(typeof OVERRIDE_FIELDS)[number], string>;

	const saved = await upsertOverride(row);
	return json({ ok: true, tagged: !!saved, override: saved });
};
