import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireGroup } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CospendApiToken } from '$models/CospendApiToken';

/** DELETE: revoke one of the caller's own export tokens. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireGroup(locals, 'cospend');
	await dbConnect();
	const res = await CospendApiToken.deleteOne({
		token: params.token,
		createdBy: user.nickname.toLowerCase()
	});
	if (res.deletedCount === 0) return json({ error: 'Not found' }, { status: 404 });
	return json({ ok: true });
};
