import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import { estimateWorkoutKcal, type ExerciseData, type Demographics } from '$lib/data/kcalEstimate';
import { estimateCardioKcal, type CardioEstimateResult } from '$lib/data/cardioKcalEstimate';
import { FitnessGoal } from '$models/FitnessGoal';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const tenWeeksAgo = new Date();
	tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70);

	const [totalWorkouts, weeklyAgg, goal, latestMeasurement] = await Promise.all([
		WorkoutSession.countDocuments({ createdBy: user.nickname }),
		WorkoutSession.aggregate([
			{ $match: { createdBy: user.nickname, startTime: { $gte: tenWeeksAgo } } },
			{ $group: { _id: { year: { $isoWeekYear: '$startTime' }, week: { $isoWeek: '$startTime' } }, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.week': 1 } }
		]),
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.findOne(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ weight: 1, bodyFatPercent: 1, _id: 0 }
		).sort({ date: -1 }).lean() as any
	]);

	const demographics: Demographics = {
		heightCm: goal?.heightCm ?? undefined,
		isMale: (goal?.sex ?? 'male') === 'male',
		bodyWeightKg: latestMeasurement?.weight ?? undefined,
		bodyFatPct: latestMeasurement?.bodyFatPercent ?? undefined,
	};

	// Lifetime totals: tonnage lifted + cardio km + kcal estimate
	// Use stored kcalEstimate when available; fall back to on-the-fly for legacy sessions
	const DISPLAY_LIMIT = 30;
	const SMA_LOOKBACK = 6; // w - 1 where w = 7 max
	const [allSessions, weightMeasurements] = await Promise.all([
		WorkoutSession.find(
			{ createdBy: user.nickname },
			{ 'exercises.exerciseId': 1, 'exercises.sets': 1, 'exercises.totalDistance': 1, kcalEstimate: 1 }
		).lean(),
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: -1 }).limit(DISPLAY_LIMIT + SMA_LOOKBACK).lean()
	]);
	weightMeasurements.reverse(); // back to chronological order

	let totalTonnage = 0;
	let totalCardioKm = 0;
	let totalKcal = 0;
	let totalMarginSq = 0;
	const bodyWeightKg = demographics.bodyWeightKg ?? 80;

	for (const s of allSessions) {
		// Accumulate tonnage and cardio km
		for (const ex of s.exercises) {
			const exercise = getExerciseById(ex.exerciseId);
			const metrics = getExerciseMetrics(exercise);
			const isCardio = metrics.includes('distance');
			const weightMultiplier = exercise?.bilateral ? 2 : 1;
			if (isCardio) {
				for (const set of ex.sets) {
					if (!set.completed) continue;
					totalCardioKm += set.distance ?? 0;
				}
			} else {
				for (const set of ex.sets) {
					if (!set.completed) continue;
					totalTonnage += (set.weight ?? 0) * (set.reps ?? 0) * weightMultiplier;
				}
			}
		}

		// Use stored kcal or fall back to on-the-fly computation for legacy sessions
		if (s.kcalEstimate) {
			totalKcal += s.kcalEstimate.kcal;
			totalMarginSq += (s.kcalEstimate.kcal - s.kcalEstimate.lower) ** 2;
		} else {
			// Legacy session: compute on-the-fly (no GPS, uses current demographics)
			const strengthExercises: ExerciseData[] = [];
			const cardioKcalResults: CardioEstimateResult[] = [];
			for (const ex of s.exercises) {
				const exercise = getExerciseById(ex.exerciseId);
				const metrics = getExerciseMetrics(exercise);
				if (metrics.includes('distance')) {
					let dist = (ex as any).totalDistance ?? 0;
					let dur = 0;
					for (const set of ex.sets) {
						if (!set.completed) continue;
						if (!dist) dist += set.distance ?? 0;
						dur += set.duration ?? 0;
					}
					if (dist > 0 || dur > 0) {
						cardioKcalResults.push(estimateCardioKcal(ex.exerciseId, bodyWeightKg, {
							distanceKm: dist || undefined,
							durationMin: dur || undefined,
						}));
					}
				} else {
					const weightMultiplier = exercise?.bilateral ? 2 : 1;
					const sets: { weight: number; reps: number }[] = [];
					for (const set of ex.sets) {
						if (!set.completed) continue;
						if (set.reps) sets.push({ weight: (set.weight ?? 0) * weightMultiplier, reps: set.reps });
					}
					if (sets.length > 0) strengthExercises.push({ exerciseId: ex.exerciseId, sets });
				}
			}
			let sessionKcal = 0;
			let sessionMarginSq = 0;
			if (strengthExercises.length > 0) {
				const r = estimateWorkoutKcal(strengthExercises, demographics);
				sessionKcal += r.kcal;
				sessionMarginSq += (r.kcal - r.lower) ** 2;
			}
			for (const r of cardioKcalResults) {
				sessionKcal += r.kcal;
				sessionMarginSq += (r.kcal - r.lower) ** 2;
			}
			totalKcal += sessionKcal;
			totalMarginSq += sessionMarginSq;
		}
	}

	const combinedMargin = Math.round(Math.sqrt(totalMarginSq));
	const kcalEstimate = {
		kcal: totalKcal,
		lower: Math.max(0, totalKcal - combinedMargin),
		upper: totalKcal + combinedMargin,
	};

	// Split into lookback-only (not displayed) and display portions
	const displayStart = Math.max(0, weightMeasurements.length - DISPLAY_LIMIT);

	// Build chart-ready workouts-per-week with filled gaps
	const weekMap = new Map<string, number>();
	for (const item of weeklyAgg) {
		weekMap.set(`${item._id.year}-${item._id.week}`, item.count);
	}

	const allLabels: string[] = [];
	const allData: number[] = [];
	const now = new Date();
	for (let i = 9; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i * 7);
		const year = getISOWeekYear(d);
		const week = getISOWeek(d);
		const key = `${year}-${week}`;
		allLabels.push(`W${week}`);
		allData.push(weekMap.get(key) ?? 0);
	}

	const workoutsChart = {
		labels: allLabels,
		data: allData
	};

	// Build chart-ready weight data with SMA ± 1 std dev confidence band
	const weightChart: {
		labels: string[];
		dates: string[];
		data: number[];
		sma: (number | null)[];
		upper: (number | null)[];
		lower: (number | null)[];
	} = { labels: [], dates: [], data: [], sma: [], upper: [], lower: [] };
	const allWeights: number[] = weightMeasurements.map(m => m.weight!);
	for (let idx = displayStart; idx < weightMeasurements.length; idx++) {
		const d = new Date(weightMeasurements[idx].date);
		weightChart.labels.push(
			d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
		);
		weightChart.dates.push(d.toISOString());
		weightChart.data.push(allWeights[idx]);
	}

	// Adaptive window: 7 if enough data, otherwise half the data (min 2)
	const w = Math.min(7, Math.max(2, Math.floor(allWeights.length / 2)));
	for (let idx = displayStart; idx < allWeights.length; idx++) {
		// Use full window when available, otherwise use all points so far
		const k = Math.min(w, idx + 1);
		let sum = 0;
		for (let j = idx - k + 1; j <= idx; j++) sum += allWeights[j];
		const mean = sum / k;

		let variance = 0;
		for (let j = idx - k + 1; j <= idx; j++) variance += (allWeights[j] - mean) ** 2;
		// Bessel's correction (k-1) for unbiased sample variance;
		// scale by sqrt(w/k) so the band widens when k < w
		const std = k > 1
			? Math.sqrt(variance / (k - 1)) * Math.sqrt(w / k)
			: Math.sqrt(variance) * Math.sqrt(w);

		const round = (v: number) => Math.round(v * 100) / 100;
		weightChart.sma.push(round(mean));
		weightChart.upper.push(round(mean + std));
		weightChart.lower.push(round(mean - std));
	}

	return json({
		totalWorkouts,
		totalTonnage: Math.round(totalTonnage / 1000 * 10) / 10,
		totalCardioKm: Math.round(totalCardioKm * 10) / 10,
		kcalEstimate,
		workoutsChart,
		weightChart
	});
};

function getISOWeek(date: Date): number {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const week1 = new Date(d.getFullYear(), 0, 4);
	return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getISOWeekYear(date: Date): number {
	const d = new Date(date.getTime());
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	return d.getFullYear();
}
