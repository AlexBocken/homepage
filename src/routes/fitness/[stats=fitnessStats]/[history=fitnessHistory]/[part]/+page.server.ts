import { error } from '@sveltejs/kit';
import { findBodyPart } from '$lib/js/fitnessBodyParts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const card = findBodyPart(params.part);
	if (!card) throw error(404, 'Unknown body part');

	const res = await fetch('/api/fitness/measurements?limit=500');
	const list = res.ok ? await res.json() : { measurements: [] };

	return {
		card,
		measurements: list.measurements ?? []
	};
};
