import crypto from 'crypto';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireSelf, getUser } from '$lib/server/authentik';
import { sendEmailChangeVerification } from '$lib/server/mailer';
import { dbConnect } from '$utils/db';
import { EmailChangeToken } from '$models/EmailChangeToken';

// Pragmatic email check — Authentik does the authoritative validation on write.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Initiate a verified email-address change. Stores a single-use, hashed,
 * expiring token and emails the confirmation link to the NEW address. The change
 * is only applied once that link is visited (see /verify-email).
 */
export const POST: RequestHandler = async ({ locals, request, url }) => {
	const { pk, nickname } = await requireSelf(locals);

	const body = await request.json().catch(() => null);
	const newEmail = typeof body?.newEmail === 'string' ? body.newEmail.trim() : '';
	if (!EMAIL_RE.test(newEmail)) throw error(400, 'Ungültige E-Mail-Adresse.');

	const current = await getUser(pk);
	const displayName = current.name || nickname;
	if (newEmail.toLowerCase() === (current.email ?? '').toLowerCase()) {
		throw error(400, 'Das ist bereits deine aktuelle E-Mail-Adresse.');
	}

	await dbConnect();
	// One pending change per user — supersede any earlier request.
	await EmailChangeToken.deleteMany({ pk });

	const token = crypto.randomBytes(32).toString('base64url');
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	await EmailChangeToken.create({
		tokenHash,
		pk,
		username: nickname,
		newEmail,
		expiresAt: new Date(Date.now() + TTL_MS)
	});

	const link = `${url.origin}/verify-email?token=${token}`;
	await sendEmailChangeVerification(newEmail, displayName, link);

	return json({ ok: true });
};
