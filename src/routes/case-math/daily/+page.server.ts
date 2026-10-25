import type { PageServerLoad } from './$types';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { getOverview } from '$lib/server/caseMath';
import { buildDailySet } from '$lib/js/caseMath/adaptive';
import { mulberry32, newSeed } from '$lib/js/caseMath/rng';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireFinanceOwner(locals);
	const { skills } = await getOverview(user.nickname);
	return { plan: buildDailySet(skills, mulberry32(newSeed())) };
};
