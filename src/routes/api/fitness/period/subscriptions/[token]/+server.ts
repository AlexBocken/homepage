import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodCalendarToken } from '$models/PeriodCalendarToken';

/** DELETE: revoke one of the current user's subscription links. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();
	const res = await PeriodCalendarToken.deleteOne({
		token: params.token,
		createdBy: user.nickname.toLowerCase()
	});
	if (res.deletedCount === 0) return json({ error: 'Not found' }, { status: 404 });
	return json({ ok: true });
};
