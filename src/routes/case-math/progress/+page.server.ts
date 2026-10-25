import type { PageServerLoad } from './$types';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { getOverview, getTrends } from '$lib/server/caseMath';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireFinanceOwner(locals);
	const [overview, trends] = await Promise.all([getOverview(user.nickname), getTrends(user.nickname)]);
	return { overview, trends };
};
