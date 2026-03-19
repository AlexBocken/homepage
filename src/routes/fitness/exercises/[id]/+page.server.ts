import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const [exerciseRes, historyRes, statsRes] = await Promise.all([
		fetch(`/api/fitness/exercises/${params.id}`),
		fetch(`/api/fitness/exercises/${params.id}/history?limit=20`),
		fetch(`/api/fitness/exercises/${params.id}/stats`)
	]);

	if (!exerciseRes.ok) {
		error(404, 'Exercise not found');
	}

	return {
		exercise: await exerciseRes.json(),
		history: await historyRes.json(),
		stats: await statsRes.json()
	};
};
