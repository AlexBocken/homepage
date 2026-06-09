import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireSelf, verifyPassword, setPassword } from '$lib/server/authentik';

const MIN_PASSWORD_LENGTH = 10;

/**
 * Change the user's password.
 *
 * The current password is verified against Authentik's authentication flow
 * before the change is applied (Authentik's admin set_password endpoint cannot
 * verify it itself). This guards against a hijacked session silently taking over
 * the account.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { pk, nickname } = await requireSelf(locals);

	const body = await request.json().catch(() => null);
	const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
	const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

	if (!currentPassword) throw error(400, 'Aktuelles Passwort erforderlich.');
	if (newPassword.length < MIN_PASSWORD_LENGTH) {
		throw error(400, `Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
	}

	const valid = await verifyPassword(nickname, currentPassword);
	if (!valid) throw error(403, 'Aktuelles Passwort ist falsch.');

	await setPassword(pk, newPassword);
	return json({ ok: true });
};
