import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import { estimateWorkoutKcal, estimateCumulativeKcal, type ExerciseData, type Demographics } from '$lib/data/kcalEstimate';
import { estimateCardioKcal, estimateCumulativeCardioKcal, type CardioEstimateResult } from '$lib/data/cardioKcalEstimate';
import { FitnessGoal } from '$models/FitnessGoal';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const tenWeeksAgo = new Date();
	tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70);

	const totalWorkouts = await WorkoutSession.countDocuments({ createdBy: user.nickname });

	const weeklyAgg = await WorkoutSession.aggregate([
		{
			$match: {
				createdBy: user.nickname,
				startTime: { $gte: tenWeeksAgo }
			}
		},
		{
			$group: {
				_id: {
					year: { $isoWeekYear: '$startTime' },
					week: { $isoWeek: '$startTime' }
				},
				count: { $sum: 1 }
			}
		},
		{
			$sort: { '_id.year': 1, '_id.week': 1 }
		}
	]);

	// Fetch user demographics for kcal estimation
	const [goal, latestMeasurement] = await Promise.all([
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
	const allSessions = await WorkoutSession.find(
		{ createdBy: user.nickname },
		{ 'exercises.exerciseId': 1, 'exercises.sets': 1, 'exercises.totalDistance': 1 }
	).lean();

	let totalTonnage = 0;
	let totalCardioKm = 0;
	const workoutKcalResults: { kcal: number; see: number }[] = [];
	const cardioKcalResults: CardioEstimateResult[] = [];
	const bodyWeightKg = demographics.bodyWeightKg ?? 80;

	for (const s of allSessions) {
		const strengthExercises: ExerciseData[] = [];
		for (const ex of s.exercises) {
			const exercise = getExerciseById(ex.exerciseId);
			const metrics = getExerciseMetrics(exercise);
			const isCardio = metrics.includes('distance');
			const weightMultiplier = exercise?.bilateral ? 2 : 1;
			const completedSets: { weight: number; reps: number }[] = [];
			if (isCardio) {
				let dist = (ex as any).totalDistance ?? 0;
				let dur = 0;
				for (const set of ex.sets) {
					if (!set.completed) continue;
					if (!dist) dist += set.distance ?? 0;
					dur += set.duration ?? 0;
					totalCardioKm += set.distance ?? 0;
				}
				if (dist > 0 || dur > 0) {
					cardioKcalResults.push(estimateCardioKcal(ex.exerciseId, bodyWeightKg, {
						distanceKm: dist || undefined,
						durationMin: dur || undefined,
					}));
				}
			} else {
				for (const set of ex.sets) {
					if (!set.completed) continue;
					const w = (set.weight ?? 0) * weightMultiplier;
					totalTonnage += w * (set.reps ?? 0);
					if (set.reps) completedSets.push({ weight: w, reps: set.reps });
				}
				if (completedSets.length > 0) {
					strengthExercises.push({ exerciseId: ex.exerciseId, sets: completedSets });
				}
			}
		}
		if (strengthExercises.length > 0) {
			const result = estimateWorkoutKcal(strengthExercises, demographics);
			workoutKcalResults.push({ kcal: result.kcal, see: result.see });
		}
	}

	const strengthKcal = estimateCumulativeKcal(workoutKcalResults);
	const cardioKcal = estimateCumulativeCardioKcal(cardioKcalResults);
	const totalKcal = strengthKcal.kcal + cardioKcal.kcal;
	const sMargin = strengthKcal.kcal - strengthKcal.lower;
	const cMargin = cardioKcal.kcal - cardioKcal.lower;
	const combinedMargin = Math.round(Math.sqrt(sMargin ** 2 + cMargin ** 2));
	const kcalEstimate = {
		kcal: totalKcal,
		lower: Math.max(0, totalKcal - combinedMargin),
		upper: totalKcal + combinedMargin,
	};

	const weightMeasurements = await BodyMeasurement.find(
		{ createdBy: user.nickname, weight: { $ne: null } },
		{ date: 1, weight: 1, _id: 0 }
	)
		.sort({ date: 1 })
		.limit(30)
		.lean();

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
	const weights: number[] = [];
	for (const m of weightMeasurements) {
		const d = new Date(m.date);
		weightChart.labels.push(
			d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
		);
		weightChart.dates.push(d.toISOString());
		weightChart.data.push(m.weight!);
		weights.push(m.weight!);
	}

	// Adaptive window: 7 if enough data, otherwise half the data (min 2)
	const w = Math.min(7, Math.max(2, Math.floor(weights.length / 2)));
	for (let i = 0; i < weights.length; i++) {
		if (i < w - 1) {
			weightChart.sma.push(null);
			weightChart.upper.push(null);
			weightChart.lower.push(null);
		} else {
			let sum = 0;
			for (let j = i - w + 1; j <= i; j++) sum += weights[j];
			const mean = sum / w;

			let variance = 0;
			for (let j = i - w + 1; j <= i; j++) variance += (weights[j] - mean) ** 2;
			const std = Math.sqrt(variance / w);

			const round = (v: number) => Math.round(v * 100) / 100;
			weightChart.sma.push(round(mean));
			weightChart.upper.push(round(mean + std));
			weightChart.lower.push(round(mean - std));
		}
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
