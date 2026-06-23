import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [segRes, goalRes, beRes] = await Promise.all([
		fetch('/api/fitness/segments'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/stats/best-efforts')
	]);
	const segData = segRes.ok ? await segRes.json() : { segments: [] };
	const goalData = goalRes.ok ? await goalRes.json() : { shareSegments: true };
	const beData = beRes.ok ? await beRes.json() : { efforts: [] };
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		segments: (segData.segments ?? []) as any[],
		shareSegments: !!goalData.shareSegments,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		bestEfforts: (beData.efforts ?? []) as any[]
	};
};
