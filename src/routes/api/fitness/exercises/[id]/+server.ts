import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnrichedExerciseById, findSimilarExercises } from '$lib/data/exercisedb';
import { requireAuth } from '$lib/server/middleware/auth';

// GET /api/fitness/exercises/[id] - Get enriched exercise with EDB data + similar exercises
export const GET: RequestHandler = async ({ params, locals, url }) => {
	await requireAuth(locals);

	const lang = url.searchParams.get('lang') === 'de' ? 'de' : 'en';
	const exercise = getEnrichedExerciseById(params.id, lang);
	if (!exercise) {
		return json({ error: 'Exercise not found' }, { status: 404 });
	}

	const similar = findSimilarExercises(params.id, 4, lang);

	return json({ exercise, similar });
};
