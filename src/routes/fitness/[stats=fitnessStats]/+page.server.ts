import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = locals.session ?? await locals.auth();
	const [res, goalRes, heatmapRes, nutritionRes, latestRes, periodRes, sharedRes] = await Promise.all([
		fetch('/api/fitness/stats/overview'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/stats/muscle-heatmap?weeks=8'),
		fetch('/api/fitness/stats/nutrition'),
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/period').catch(() => null),
		fetch('/api/fitness/period/shared').catch(() => null)
	]);
	const stats = await res.json();
	const goal = goalRes.ok ? await goalRes.json() : { weeklyWorkouts: null, streak: 0 };
	const muscleHeatmap = heatmapRes.ok ? await heatmapRes.json() : { weeks: [], totals: {}, muscleGroups: [] };
	const nutritionStats = nutritionRes.ok ? await nutritionRes.json() : null;
	const latest = latestRes.ok ? await latestRes.json() : {};
	const periods = periodRes?.ok ? (await periodRes.json()).entries : [];
	const sharedPeriods = sharedRes?.ok ? (await sharedRes.json()).shared : [];
	return { session, stats, goal, muscleHeatmap, nutritionStats, latest, periods, sharedPeriods };
};
