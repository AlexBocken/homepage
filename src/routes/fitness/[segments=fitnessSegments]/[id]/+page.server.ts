import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const res = await fetch(`/api/fitness/segments/${params.id}`);
	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Segment not found');
	}
	const data = await res.json();
	return {
		segment: data.segment,
		leaderboard: data.leaderboard ?? [],
		myEfforts: data.myEfforts ?? [],
		myBest: data.myBest ?? null,
		myRank: data.myRank ?? null
	};
};
