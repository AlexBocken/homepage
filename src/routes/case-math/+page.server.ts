import type { PageServerLoad } from './$types';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { getOverview } from '$lib/server/caseMath';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireFinanceOwner(locals);
	return { overview: await getOverview(user.nickname) };
};
