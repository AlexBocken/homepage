import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const lang = url.pathname.includes('/uebungen') ? 'de' : 'en';
	const [exerciseRes, historyRes, statsRes] = await Promise.all([
		fetch(`/api/fitness/exercises/${params.id}?lang=${lang}`),
		fetch(`/api/fitness/exercises/${params.id}/history?limit=20`),
		fetch(`/api/fitness/exercises/${params.id}/stats`)
	]);

	if (!exerciseRes.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Exercise not found');
	}

	const exerciseData = await exerciseRes.json();

	return {
		exercise: exerciseData.exercise,
		similar: exerciseData.similar ?? [],
		history: await historyRes.json(),
		stats: await statsRes.json()
	};
};
