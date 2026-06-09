import crypto from 'crypto';
import type { PageServerLoad } from './$types';
import { patchUser } from '$lib/server/authentik';
import { dbConnect } from '$utils/db';
import { EmailChangeToken } from '$models/EmailChangeToken';

type Result = { status: 'success' | 'invalid' | 'error'; email?: string };

/**
 * Confirm a pending email-address change from the link sent to the new address.
 * The token is the capability (no session required — it was issued to an
 * authenticated user and delivered to the address being claimed). Single-use:
 * the token document is consumed atomically before the change is applied.
 */
export const load: PageServerLoad = async ({ url }): Promise<Result> => {
	const token = url.searchParams.get('token');
	if (!token) return { status: 'invalid' };

	await dbConnect();
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const doc = await EmailChangeToken.findOneAndDelete({
		tokenHash,
		expiresAt: { $gt: new Date() }
	}).lean<{ pk: number; newEmail: string }>();

	if (!doc) return { status: 'invalid' };

	try {
		await patchUser(doc.pk, { email: doc.newEmail });
		return { status: 'success', email: doc.newEmail };
	} catch (e) {
		console.error('[verify-email] failed to apply email change', e);
		return { status: 'error' };
	}
};
