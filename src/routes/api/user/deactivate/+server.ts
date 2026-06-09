import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireSelf, patchUser } from '$lib/server/authentik';

/**
 * Soft-deactivate the user's own account (is_active = false). Reversible only by
 * an administrator. The client is expected to log the user out afterwards.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { pk } = await requireSelf(locals);

	const body = await request.json().catch(() => null);
	if (body?.confirm !== true) throw error(400, 'Bestätigung erforderlich.');

	await patchUser(pk, { is_active: false });
	return json({ ok: true });
};
