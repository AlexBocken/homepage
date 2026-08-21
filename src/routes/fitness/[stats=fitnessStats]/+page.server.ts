import type { PageServerLoad } from './$types';
import { buildSegStat, type SegStat } from '$lib/fitness/segmentStat';

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
	const session = locals.session ?? await locals.auth();

	/**
	 * Whether to hand back the heavy panels as values rather than as promises.
	 *
	 * Streaming is what keeps this page's shell fast: the charts and cards are on
	 * screen while the slow aggregates are still being worked out. But a stream is
	 * finished by a script running in the browser, so with scripting off those panels
	 * never arrive at all — the macro rings, the protein, calorie-balance and
	 * adherence cards and the muscle heatmap sat empty behind their "nothing logged
	 * yet" hints, which is a lie told to someone with a full diary.
	 *
	 * Rather than make every visitor wait for the case that cannot stream, the page
	 * carries a `<noscript>` refresh to this flag: a browser with no script asks a
	 * second time, and only that request waits for everything. One extra round trip
	 * for the readers who were getting nothing, and none for anyone else.
	 */
	const awaitEverything = url.searchParams.has('nojs');

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

	// Started here either way — only whether they are waited for changes.
	const muscleHeatmapPromise = fetch('/api/fitness/stats/muscle-heatmap?weeks=8')
		.then(r => r.ok ? r.json() : { weeks: [], totals: {}, muscleGroups: [] })
		.catch(() => ({ weeks: [], totals: {}, muscleGroups: [] }));
	const nutritionStatsPromise = fetch('/api/fitness/stats/nutrition')
		.then(r => r.ok ? r.json() : null)
		.catch(() => null);

	const periodsPromise = fetch('/api/fitness/period')
		.then(r => r.ok ? r.json().then(j => j.entries) : [])
		.catch(() => []);
	const sharedPeriodsPromise = fetch('/api/fitness/period/shared')
		.then(r => r.ok ? r.json().then(j => j.shared) : [])
		.catch(() => []);

	// Four promises or four values. The page reads both shapes: a settled one becomes
	// the card's initial state and so lands in the server-rendered HTML, a pending
	// one fills the card in when it arrives.
	const [muscleHeatmap, nutritionStats, periods, sharedPeriods] = awaitEverything
		? await Promise.all([muscleHeatmapPromise, nutritionStatsPromise, periodsPromise, sharedPeriodsPromise])
		: [muscleHeatmapPromise, nutritionStatsPromise, periodsPromise, sharedPeriodsPromise];

	return {
		session, stats, goal, latest, dashboard,
		segList, segChosenIds, segStats, fastest, fastestKm, fastestActivity,
		muscleHeatmap, nutritionStats, periods, sharedPeriods
	};
};
