import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { extractId, segmentParam } from '$lib/fitness/prettyUrl';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	// Only the trailing id is real — see $lib/fitness/prettyUrl.
	const id = extractId(params.id);

	const res = await fetch(`/api/fitness/segments/${id}`);
	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Segment not found');
	}
	const data = await res.json();

	// Heal the URL to its canonical spelling once the segment is known to exist, so
	// a bare id or a slug left stale by a rename still lands on a pretty URL.
	// Deliberately after the fetch: an unknown id 404s rather than redirecting to a
	// prettier 404.
	const canonical = segmentParam(data.segment);
	if (canonical !== params.id) {
		const target = resolve('/fitness/[segments=fitnessSegments]/[id]', {
			segments: params.segments,
			id: canonical
		});
		redirect(308, `${target}${url.search}`);
	}

	return {
		segment: data.segment,
		leaderboard: data.leaderboard ?? [],
		myEfforts: data.myEfforts ?? [],
		myBest: data.myBest ?? null,
		myRank: data.myRank ?? null
	};
};
