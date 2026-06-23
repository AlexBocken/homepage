import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodCalendarToken } from '$models/PeriodCalendarToken';

/** DELETE: revoke a subscription link. Allowed for the link's creator OR the
 *  owner of the tracker the link points at (so a tracker owner can clean up links
 *  made by people they shared access with). */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();
	// createdBy is stored lowercased; dataOwner keeps the owner's actual case
	// (= their nickname), so match each in its own form.
	const res = await PeriodCalendarToken.deleteOne({
		token: params.token,
		$or: [{ createdBy: user.nickname.toLowerCase() }, { dataOwner: user.nickname }]
	});
	if (res.deletedCount === 0) return json({ error: 'Not found' }, { status: 404 });
	return json({ ok: true });
};
