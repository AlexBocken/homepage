import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = locals.session ?? await locals.auth();

	// stats / goal / latest block the shell because the main charts, goal header,
	// and body-part cards all depend on them. The heavier panels below stream.
	const [res, goalRes, latestRes] = await Promise.all([
		fetch('/api/fitness/stats/overview'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest')
	]);
	const stats = await res.json();
	const goal = goalRes.ok ? await goalRes.json() : { weeklyWorkouts: null, streak: 0 };
	const latest = latestRes.ok ? await latestRes.json() : {};

	// Streamed — resolved into $state-backed locals on the client so the card
	// shells render immediately and fill in once the value arrives. Error
	// fallbacks keep the previous empty shapes.
	const muscleHeatmap = fetch('/api/fitness/stats/muscle-heatmap?weeks=8')
		.then(r => r.ok ? r.json() : { weeks: [], totals: {}, muscleGroups: [] })
		.catch(() => ({ weeks: [], totals: {}, muscleGroups: [] }));
	const nutritionStats = fetch('/api/fitness/stats/nutrition')
		.then(r => r.ok ? r.json() : null)
		.catch(() => null);
	const periods = fetch('/api/fitness/period')
		.then(r => r.ok ? r.json().then(j => j.entries) : [])
		.catch(() => []);
	const sharedPeriods = fetch('/api/fitness/period/shared')
		.then(r => r.ok ? r.json().then(j => j.shared) : [])
		.catch(() => []);

	return { session, stats, goal, latest, muscleHeatmap, nutritionStats, periods, sharedPeriods };
};
