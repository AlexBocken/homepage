import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import type { IPr } from '$models/WorkoutSession';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import { detectCardioPrs } from '$lib/data/cardioPrRanges';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import { computeSessionKcal } from '$lib/server/computeSessionKcal';
import { trackDistance } from '$lib/fitness/gpsSeries.js';
import mongoose from 'mongoose';

function estimatedOneRepMax(weight: number, reps: number): number {
	if (reps <= 0 || weight <= 0) return 0;
	if (reps === 1) return weight;
	return Math.round(weight * (1 + reps / 30));
}

// POST /api/fitness/sessions/[id]/recalculate — recompute derived fields
export const POST: RequestHandler = async ({ params, locals }) => {
	const session = locals.session ?? await locals.auth();
	if (!session || !session.user?.nickname) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid session ID' }, { status: 400 });
	}

	try {
		await dbConnect();

		const workoutSession = await WorkoutSession.findOne({
			_id: params.id,
			createdBy: session.user.nickname
		});

		if (!workoutSession) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		// First refresh per-set distance from the GPS track so a re-snapped /
		// re-imported track flows through to the logged set distance. Single set
		// → exact track length; multiple sets → scaled proportionally (same rule
		// the snap endpoint uses).
		for (const ex of workoutSession.exercises) {
			const isCardio = getExerciseMetrics(getExerciseById(ex.exerciseId)).includes('distance');
			if (!isCardio || !ex.gpsTrack || ex.gpsTrack.length < 2) continue;
			const gpsDist = Math.round(trackDistance(ex.gpsTrack) * 100) / 100;
			const completedWithDist = ex.sets.filter((s) => s.completed && (s.distance ?? 0) > 0);
			const recordedDist = completedWithDist.reduce((sum, s) => sum + (s.distance ?? 0), 0);
			if (completedWithDist.length === 1) {
				completedWithDist[0].distance = gpsDist;
			} else if (recordedDist > 0) {
				const ratio = gpsDist / recordedDist;
				for (const s of completedWithDist) s.distance = Math.round((s.distance ?? 0) * ratio * 100) / 100;
			}
			ex.totalDistance = gpsDist;
		}

		// Recompute totalVolume and totalDistance from the (refreshed) sets.
		let totalVolume = 0;
		let totalDistance = 0;
		for (let i = 0; i < workoutSession.exercises.length; i++) {
			const ex = workoutSession.exercises[i];
			const exercise = getExerciseById(ex.exerciseId);
			const metrics = getExerciseMetrics(exercise);
			const isCardio = metrics.includes('distance');
			const isBilateral = exercise?.bilateral ?? false;
			for (const s of ex.sets) {
				if (!s.completed) continue;
				if (isCardio) {
					totalDistance += s.distance ?? 0;
				} else {
					totalVolume += (s.weight ?? 0) * (s.reps ?? 0) * (isBilateral ? 2 : 1);
				}
			}

			// Regenerate gpsPreview from gpsTrack if present
			if (ex.gpsTrack && ex.gpsTrack.length >= 2) {
				ex.gpsPreview = simplifyTrack(ex.gpsTrack);
			}
		}

		// Detect PRs
		const prs: IPr[] = [];
		for (const ex of workoutSession.exercises) {
			const exercise = getExerciseById(ex.exerciseId);
			const metrics = getExerciseMetrics(exercise);
			const isCardio = metrics.includes('distance');

			const completedSets = ex.sets.filter(s => s.completed);
			if (completedSets.length === 0) continue;

			// Find previous best (sessions before this one)
			const prevSessions = await WorkoutSession.find({
				createdBy: session.user!.nickname,
				'exercises.exerciseId': ex.exerciseId,
				startTime: { $lt: workoutSession.startTime }
			}).sort({ startTime: -1 }).limit(50).lean();

			if (isCardio) {
				prs.push(...detectCardioPrs(ex.exerciseId, completedSets, prevSessions));
				continue;
			}

			const isBilateral = exercise?.bilateral ?? false;
			const weightMul = isBilateral ? 2 : 1;

			let prevBestWeight = 0;
			let prevBestEst1rm = 0;
			let prevBestVolume = 0;
			for (const ps of prevSessions) {
				const pe = ps.exercises.find(e => e.exerciseId === ex.exerciseId);
				if (!pe) continue;
				for (const s of pe.sets) {
					if (!s.completed || !s.weight || !s.reps) continue;
					prevBestWeight = Math.max(prevBestWeight, s.weight);
					prevBestEst1rm = Math.max(prevBestEst1rm, estimatedOneRepMax(s.weight, s.reps));
					prevBestVolume = Math.max(prevBestVolume, s.weight * s.reps * weightMul);
				}
			}

			let bestWeight = 0;
			let bestEst1rm = 0;
			let bestVolume = 0;
			for (const s of completedSets) {
				if (!s.weight || !s.reps) continue;
				bestWeight = Math.max(bestWeight, s.weight);
				bestEst1rm = Math.max(bestEst1rm, estimatedOneRepMax(s.weight, s.reps));
				bestVolume = Math.max(bestVolume, s.weight * s.reps * weightMul);
			}

			if (bestWeight > prevBestWeight && prevBestWeight > 0) {
				prs.push({ exerciseId: ex.exerciseId, type: 'maxWeight', value: bestWeight });
			}
			if (bestEst1rm > prevBestEst1rm && prevBestEst1rm > 0) {
				prs.push({ exerciseId: ex.exerciseId, type: 'est1rm', value: bestEst1rm });
			}
			if (bestVolume > prevBestVolume && prevBestVolume > 0) {
				prs.push({ exerciseId: ex.exerciseId, type: 'bestSetVolume', value: Math.round(bestVolume) });
			}
		}

		// Recompute kcal estimate using best available method
		const kcalEstimate = await computeSessionKcal(
			workoutSession.exercises,
			session.user.nickname
		);

		// Persist the refreshed sets + recomputed fields (gpsTrack is loaded, so a
		// full save preserves it).
		workoutSession.totalVolume = totalVolume > 0 ? totalVolume : undefined;
		workoutSession.totalDistance = totalDistance > 0 ? totalDistance : undefined;
		workoutSession.prs = prs.length > 0 ? prs : undefined;
		workoutSession.kcalEstimate = kcalEstimate ?? undefined;
		workoutSession.markModified('exercises');
		await workoutSession.save();

		return json({
			totalVolume: totalVolume > 0 ? totalVolume : undefined,
			totalDistance: totalDistance > 0 ? totalDistance : undefined,
			prs: prs.length,
			kcalEstimate
		});
	} catch (error) {
		console.error('Error recalculating session:', error);
		return json({ error: 'Failed to recalculate' }, { status: 500 });
	}
};
