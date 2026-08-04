import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [segRes, goalRes, beMineRes, beAllRes, tplRes] = await Promise.all([
		fetch('/api/fitness/segments'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/stats/best-efforts?scope=me'),
		fetch('/api/fitness/stats/best-efforts?scope=all'),
		// Per-workout progress for the board the page opens on; the cycling board loads
		// on demand, same as best efforts.
		fetch('/api/fitness/stats/workout-templates?activity=running')
	]);
	const segData = segRes.ok ? await segRes.json() : { segments: [] };
	const goalData = goalRes.ok ? await goalRes.json() : { shareSegments: true };
	const beMine = beMineRes.ok ? await beMineRes.json() : { efforts: [] };
	const beAll = beAllRes.ok ? await beAllRes.json() : { efforts: [] };
	const tplRunning = tplRes.ok ? await tplRes.json() : { templates: [] };
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		segments: (segData.segments ?? []) as any[],
		shareSegments: !!goalData.shareSegments,
		// "Mine" tab → own best efforts; "All" tab → website-wide leaderboard.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		bestEffortsMine: (beMine.efforts ?? []) as any[],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		bestEffortsAll: (beAll.efforts ?? []) as any[],
		// Own repeated workouts — a template is private, so this has no "all" scope.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		templatesRunning: (tplRunning.templates ?? []) as any[]
	};
};
