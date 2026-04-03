/**
 * Server-side kcal computation for a workout session.
 * Uses the best available method: GPS track > distance+duration > flat rate.
 * Fetches user demographics from DB for strength estimation.
 */
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import { estimateWorkoutKcal, type ExerciseData, type Demographics } from '$lib/data/kcalEstimate';
import { estimateCardioKcal } from '$lib/data/cardioKcalEstimate';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import type { IKcalEstimate, ICompletedExercise } from '$models/WorkoutSession';

export async function computeSessionKcal(
	exercises: ICompletedExercise[],
	username: string
): Promise<IKcalEstimate | undefined> {
	// Fetch user demographics
	const [goal, latestMeasurement] = await Promise.all([
		FitnessGoal.findOne({ username }).lean() as any,
		BodyMeasurement.findOne(
			{ createdBy: username, weight: { $ne: null } },
			{ weight: 1, bodyFatPercent: 1, _id: 0 }
		).sort({ date: -1 }).lean() as any
	]);

	const demographics: Demographics = {
		heightCm: goal?.heightCm ?? undefined,
		isMale: (goal?.sex ?? 'male') === 'male',
		bodyWeightKg: latestMeasurement?.weight ?? undefined,
		bodyFatPct: latestMeasurement?.bodyFatPercent ?? undefined,
	};
	const bodyWeightKg = demographics.bodyWeightKg ?? 80;

	const strengthExercises: ExerciseData[] = [];
	let cardioKcal = 0;
	let cardioMarginSq = 0;
	const methods = new Set<string>();

	for (const ex of exercises) {
		const exercise = getExerciseById(ex.exerciseId);
		const metrics = getExerciseMetrics(exercise);

		if (metrics.includes('distance')) {
			let dist = ex.totalDistance ?? 0;
			let dur = 0;
			for (const s of ex.sets) {
				if (!s.completed) continue;
				if (!dist) dist += s.distance ?? 0;
				dur += s.duration ?? 0;
			}
			const hasGps = ex.gpsTrack && ex.gpsTrack.length >= 2;
			if (dist > 0 || dur > 0 || hasGps) {
				const r = estimateCardioKcal(ex.exerciseId, bodyWeightKg, {
					gpsTrack: hasGps ? ex.gpsTrack : undefined,
					distanceKm: dist || undefined,
					durationMin: dur || undefined,
				});
				cardioKcal += r.kcal;
				cardioMarginSq += (r.kcal - r.lower) ** 2;
				methods.add(r.method);
			}
		} else {
			const weightMultiplier = exercise?.bilateral ? 2 : 1;
			const sets = ex.sets
				.filter(s => s.completed && (s.reps ?? 0) > 0)
				.map(s => ({
					weight: (s.weight ?? 0) * weightMultiplier,
					reps: s.reps ?? 0
				}));
			if (sets.length > 0) {
				strengthExercises.push({ exerciseId: ex.exerciseId, sets });
			}
		}
	}

	const strengthResult = strengthExercises.length > 0
		? estimateWorkoutKcal(strengthExercises, demographics)
		: null;

	if (!strengthResult && cardioKcal === 0) return undefined;

	if (strengthResult) methods.add('lytle');

	const total = (strengthResult?.kcal ?? 0) + cardioKcal;
	const sMargin = strengthResult ? (strengthResult.kcal - strengthResult.lower) : 0;
	const margin = Math.round(Math.sqrt(sMargin ** 2 + cardioMarginSq));

	return {
		kcal: Math.round(total),
		lower: Math.max(0, Math.round(total) - margin),
		upper: Math.round(total) + margin,
		methods: [...methods],
	};
}
