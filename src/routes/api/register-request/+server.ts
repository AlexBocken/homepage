import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { sendAccountRequest } from '$lib/server/mailer';
import { isRequestable, groupLabel } from '$lib/server/groups';
import { rateLimit } from '$lib/server/hikesRouting';

// Pragmatic email check — the admin does the authoritative validation on creation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_USERNAME = 64;
const MAX_NOTE = 1000;

/**
 * Public account-request form (no auth — there are no accounts yet). We do NOT
 * create anything: the request is validated against the requestable group
 * allow-list and emailed to the admin, who creates the account in Authentik.
 *
 * Abuse guards: per-client rate limit + a honeypot field, since this endpoint
 * sends mail unauthenticated.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const limit = rateLimit(`register-request:${getClientAddress()}`);
	if (!limit.ok) throw error(429, `Zu viele Anfragen. Bitte in ${limit.retryAfter ?? 60} s erneut versuchen.`);

	const body = await request.json().catch(() => null);
	// Honeypot — real users never fill this hidden field. Silently accept (so a
	// bot can't distinguish success from rejection) but send nothing.
	if (typeof body?.website === 'string' && body.website.trim() !== '') return json({ ok: true });

	const email = typeof body?.email === 'string' ? body.email.trim() : '';
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	const note = typeof body?.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
	const codes = Array.isArray(body?.groups)
		? [...new Set(body.groups.filter((g: unknown): g is string => typeof g === 'string'))]
		: [];

	if (!EMAIL_RE.test(email)) throw error(400, 'Ungültige E-Mail-Adresse.');
	if (username.length === 0 || username.length > MAX_USERNAME) throw error(400, 'Ungültiger Benutzername.');
	// Only allow groups a normal user may request — never admin/system groups.
	if (codes.some((c) => !isRequestable(c))) throw error(400, 'Ungültige Berechtigungsauswahl.');

	await sendAccountRequest({
		email,
		username,
		groups: codes.map(groupLabel),
		note
	});

	return json({ ok: true });
};
