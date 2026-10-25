import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { getOverview, getTrends } from '$lib/server/caseMath';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireFinanceOwner(locals);
	const [overview, trends] = await Promise.all([getOverview(user.nickname), getTrends(user.nickname)]);
	return json({ ...overview, trends });
};
