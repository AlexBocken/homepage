import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { extractId, templateParam } from '$lib/fitness/prettyUrl';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	// Only the trailing id is real — see $lib/fitness/prettyUrl.
	const id = extractId(params.id);

	const res = await fetch(`/api/fitness/stats/workout-templates/${id}`);
	if (!res.ok) throw error(res.status === 404 ? 404 : 500, 'Failed to load workout progress');
	const data = await res.json();

	// Heal the URL to its canonical spelling once the workout is known to have been run,
	// so a bare id or a slug left stale by a rename still lands on a pretty URL. After
	// the fetch, deliberately: an unknown id 404s rather than redirecting to a prettier
	// 404 (same reasoning as the segment detail route).
	const canonical = templateParam({ _id: id, name: data.name });
	if (canonical !== params.id) {
		const target = resolve('/fitness/[segments=fitnessSegments]/template/[id]', {
			segments: params.segments,
			id: canonical,
		});
		redirect(308, `${target}${url.search}`);
	}

	return {
		templateId: id as string,
		name: (data.name ?? '') as string,
		exists: !!data.exists,
		activity: data.activity as 'running' | 'cycling',
		attempts: (data.attempts ?? []) as Array<{
			sessionId: string;
			name: string;
			date: string;
			km: number;
			seconds: number;
			pace: number;
		}>,
	};
};
