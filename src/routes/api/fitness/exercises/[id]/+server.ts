import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExerciseById } from '$lib/data/exercises';

// GET /api/fitness/exercises/[id] - Get exercise from static data
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const exercise = getExerciseById(params.id);
	if (!exercise) {
		return json({ error: 'Exercise not found' }, { status: 404 });
	}

	return json({ exercise });
};
