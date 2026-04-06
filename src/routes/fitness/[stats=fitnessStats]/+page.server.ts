import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = await locals.auth();
	const [res, goalRes, heatmapRes] = await Promise.all([
		fetch('/api/fitness/stats/overview'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/stats/muscle-heatmap?weeks=8')
	]);
	const stats = await res.json();
	const goal = goalRes.ok ? await goalRes.json() : { weeklyWorkouts: null, streak: 0 };
	const muscleHeatmap = heatmapRes.ok ? await heatmapRes.json() : { weeks: [], totals: {}, muscleGroups: [] };
	return { session, stats, goal, muscleHeatmap };
};
