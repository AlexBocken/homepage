import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';

/**
 * Epley formula for estimated 1RM
 */
function estimatedOneRepMax(weight: number, reps: number): number {
	if (reps <= 0 || weight <= 0) return 0;
	if (reps === 1) return weight;
	return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);

	const exercise = getExerciseById(params.id);
	if (!exercise) {
		return json({ error: 'Exercise not found' }, { status: 404 });
	}

	await dbConnect();

	const sessions = await WorkoutSession.find({
		createdBy: user.nickname,
		'exercises.exerciseId': params.id
	})
		.sort({ startTime: 1 })
		.lean();

	const metrics = getExerciseMetrics(exercise);
	const isCardio = metrics.includes('distance');

	if (isCardio) {
		// Cardio stats: distance and duration over time
		const distanceOverTime: { date: Date; value: number }[] = [];
		const durationOverTime: { date: Date; value: number }[] = [];
		let bestDistance = 0;
		let bestDuration = 0;

		for (const session of sessions) {
			const exerciseData = session.exercises.find((e) => e.exerciseId === params.id);
			if (!exerciseData) continue;

			const completedSets = exerciseData.sets.filter((s) => s.completed);
			if (completedSets.length === 0) continue;

			let sessionDistance = 0;
			let sessionDuration = 0;
			for (const set of completedSets) {
				sessionDistance += set.distance ?? 0;
				sessionDuration += set.duration ?? 0;
			}

			if (sessionDistance > 0) distanceOverTime.push({ date: session.startTime, value: sessionDistance });
			if (sessionDuration > 0) durationOverTime.push({ date: session.startTime, value: sessionDuration });

			bestDistance = Math.max(bestDistance, sessionDistance);
			bestDuration = Math.max(bestDuration, sessionDuration);
		}

		return json({
			charts: { distanceOverTime, durationOverTime },
			personalRecords: { bestDistance, bestDuration },
			records: [],
			totalSessions: sessions.length
		});
	}

	// Strength stats
	const est1rmOverTime: { date: Date; value: number }[] = [];
	const maxWeightOverTime: { date: Date; value: number }[] = [];
	const totalVolumeOverTime: { date: Date; value: number }[] = [];

	const repRecords = new Map<
		number,
		{ weight: number; reps: number; date: Date; estimated1rm: number }
	>();
	let bestEst1rm = 0;
	let bestMaxWeight = 0;
	let bestMaxVolume = 0;

	for (const session of sessions) {
		const exerciseData = session.exercises.find((e) => e.exerciseId === params.id);
		if (!exerciseData) continue;

		const completedSets = exerciseData.sets.filter((s) => s.completed && s.weight && s.reps && s.reps > 0);
		if (completedSets.length === 0) continue;

		let sessionBestEst1rm = 0;
		let sessionMaxWeight = 0;
		let sessionVolume = 0;

		for (const set of completedSets) {
			const weight = set.weight!;
			const reps = set.reps!;
			const est1rm = estimatedOneRepMax(weight, reps);

			sessionBestEst1rm = Math.max(sessionBestEst1rm, est1rm);
			sessionMaxWeight = Math.max(sessionMaxWeight, weight);
			sessionVolume += weight * reps;

			const existing = repRecords.get(reps);
			if (!existing || weight > existing.weight) {
				repRecords.set(reps, {
					weight,
					reps,
					date: session.startTime,
					estimated1rm: est1rm
				});
			}
		}

		est1rmOverTime.push({ date: session.startTime, value: sessionBestEst1rm });
		maxWeightOverTime.push({ date: session.startTime, value: sessionMaxWeight });
		totalVolumeOverTime.push({ date: session.startTime, value: sessionVolume });

		bestEst1rm = Math.max(bestEst1rm, sessionBestEst1rm);
		bestMaxWeight = Math.max(bestMaxWeight, sessionMaxWeight);
		bestMaxVolume = Math.max(bestMaxVolume, sessionVolume);
	}

	const records = [...repRecords.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([reps, data]) => ({
			reps,
			weight: data.weight,
			date: data.date,
			estimated1rm: data.estimated1rm
		}));

	return json({
		charts: {
			est1rmOverTime,
			maxWeightOverTime,
			totalVolumeOverTime
		},
		personalRecords: {
			estimatedOneRepMax: bestEst1rm,
			maxWeight: bestMaxWeight,
			maxVolume: bestMaxVolume
		},
		records,
		totalSessions: sessions.length
	});
};
