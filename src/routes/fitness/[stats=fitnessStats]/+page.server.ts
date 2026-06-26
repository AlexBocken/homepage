import type { PageServerLoad } from './$types';
import { buildSegStat, type SegStat } from '$lib/fitness/segmentStat';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = locals.session ?? await locals.auth();

	// stats / goal / latest block the shell because the main charts, goal header,
	// and body-part cards all depend on them. The heavier panels below stream.
	const [res, goalRes, latestRes, dashRes] = await Promise.all([
		fetch('/api/fitness/stats/overview'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/dashboard')
	]);
	const stats = await res.json();
	const goal = goalRes.ok ? await goalRes.json() : { weeklyWorkouts: null, streak: 0 };
	const latest = latestRes.ok ? await latestRes.json() : {};
	const dashboard = dashRes.ok ? await dashRes.json() : {};

	// SSR the segment-stat + fastest-run cards so they render with data on first
	// paint instead of popping in (and shifting layout) after client hydration.
	const segIds: string[] = Array.isArray(dashboard.segmentStatIds)
		? dashboard.segmentStatIds.slice(0, 2)
		: dashboard.segmentStatId
			? [dashboard.segmentStatId]
			: [];
	const fastestKm = typeof dashboard.fastestKm === 'number' ? dashboard.fastestKm : 5;
	const fastestActivity = dashboard.fastestActivity === 'cycling' ? 'cycling' : 'running';

	const segListRes = await fetch('/api/fitness/segments?mine=1');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const segList: any[] = segListRes.ok ? (await segListRes.json()).segments ?? [] : [];
	let segChosenIds = segIds.filter((id) => segList.some((s) => s._id === id));
	if (!segChosenIds.length && segList.length) segChosenIds = [segList[0]._id];

	const now = Date.now();
	const [statEntries, fastestRes] = await Promise.all([
		Promise.all(
			segChosenIds.map(async (id) => {
				const r = await fetch(`/api/fitness/segments/${id}`);
				if (!r.ok) return [id, null] as const;
				const j = await r.json();
				return [id, buildSegStat(j, segList.find((s) => s._id === id)?.athleteCount, now)] as const;
			})
		),
		fetch(`/api/fitness/stats/fastest?km=${fastestKm}&activity=${fastestActivity}`)
	]);
	const segStats: Record<string, SegStat> = {};
	for (const [id, stat] of statEntries) if (stat) segStats[id] = stat;
	const fastest = fastestRes.ok ? (await fastestRes.json()).best ?? null : null;

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

	return {
		session, stats, goal, latest, dashboard,
		segList, segChosenIds, segStats, fastest, fastestKm, fastestActivity,
		muscleHeatmap, nutritionStats, periods, sharedPeriods
	};
};
