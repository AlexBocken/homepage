import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireSelf, getUser } from '$lib/server/authentik';
import { sendGroupRequest } from '$lib/server/mailer';
import { isRequestable, groupLabel } from '$lib/server/groups';

const MAX_NOTE = 1000;

/**
 * Self-service request to join one or more user-facing groups. There is no
 * auto-grant: we validate the selection against the requestable allow-list and
 * email the admin, who adds the membership in Authentik manually.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { pk, nickname } = await requireSelf(locals);

	const body = await request.json().catch(() => null);
	const note = typeof body?.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
	const codes = Array.isArray(body?.groups)
		? [...new Set(body.groups.filter((g: unknown): g is string => typeof g === 'string'))]
		: [];

	if (codes.length === 0) throw error(400, 'Keine Gruppen ausgewählt.');
	// Only allow groups a normal user may request — never admin/system groups.
	if (codes.some((c) => !isRequestable(c))) throw error(400, 'Ungültige Gruppenauswahl.');

	const user = await getUser(pk);
	const current = new Set(user.groups_obj?.map((g) => g.name) ?? user.groups ?? []);
	const fresh = codes.filter((c) => !current.has(c));
	if (fresh.length === 0) throw error(400, 'Du bist bereits in allen ausgewählten Gruppen.');

	await sendGroupRequest({
		username: nickname,
		displayName: user.name || nickname,
		email: user.email ?? '',
		groups: fresh.map(groupLabel),
		note
	});

	return json({ ok: true });
};
