import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { getExerciseById } from '$lib/data/exercises';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const user = await requireAuth(locals);

	const exercise = getExerciseById(params.id);
	if (!exercise) {
		return json({ error: 'Exercise not found' }, { status: 404 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	await dbConnect();

	const sessions = await WorkoutSession.find({
		createdBy: user.nickname,
		'exercises.exerciseId': params.id
	})
		.sort({ startTime: -1 })
		.skip(offset)
		.limit(limit)
		.lean();

	// Extract only the relevant exercise data from each session
	const history = sessions.map((session) => {
		const exerciseData = session.exercises.find((e) => e.exerciseId === params.id);
		return {
			sessionId: session._id,
			sessionName: session.name,
			date: session.startTime,
			sets: exerciseData?.sets ?? [],
			notes: exerciseData?.notes
		};
	});

	const total = await WorkoutSession.countDocuments({
		createdBy: user.nickname,
		'exercises.exerciseId': params.id
	});

	return json({ history, total, limit, offset });
};
