import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FinanceQuery } from '$models/FinanceQuery';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();
	const res = await FinanceQuery.deleteOne({ _id: params.id, createdBy: user.nickname });
	if (res.deletedCount === 0) throw error(404, 'Not found');
	return json({ ok: true });
};
