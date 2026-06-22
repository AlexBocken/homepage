import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [segRes, goalRes] = await Promise.all([
		fetch('/api/fitness/segments'),
		fetch('/api/fitness/goal')
	]);
	const segData = segRes.ok ? await segRes.json() : { segments: [] };
	const goalData = goalRes.ok ? await goalRes.json() : { shareSegments: true };
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		segments: (segData.segments ?? []) as any[],
		shareSegments: !!goalData.shareSegments
	};
};
