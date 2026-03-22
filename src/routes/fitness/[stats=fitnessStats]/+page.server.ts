import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = await locals.auth();
	const [res, goalRes] = await Promise.all([
		fetch('/api/fitness/stats/overview'),
		fetch('/api/fitness/goal')
	]);
	const stats = await res.json();
	const goal = goalRes.ok ? await goalRes.json() : { weeklyWorkouts: null, streak: 0 };
	return { session, stats, goal };
};
