import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FinanceApiToken } from '$models/FinanceApiToken';

const OWNER = 'alexander';

/** DELETE: revoke one of the owner's own export tokens. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	if (user.nickname?.toLowerCase() !== OWNER) throw error(403, 'Forbidden');
	await dbConnect();
	const res = await FinanceApiToken.deleteOne({
		token: params.token,
		createdBy: user.nickname.toLowerCase()
	});
	if (res.deletedCount === 0) return json({ error: 'Not found' }, { status: 404 });
	return json({ ok: true });
};
