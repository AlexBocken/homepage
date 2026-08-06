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
import { isoWeek, isoWeekYear } from '$lib/fitness/dates';
import { timeDecayedTrend } from '$lib/fitness/trend';

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
	// Dashboard weight/body-fat charts show the last DISPLAY_DAYS. The readings
	// themselves are fetched in full: the trend is then warmed up over everything
	// rather than an arbitrary run-up window, and the change tiles get a series
	// that actually reaches their reference date. The full-history *chart* still
	// lives at /fitness/stats/body.
	const DISPLAY_DAYS = 14;
	const displayCutoff = new Date();
	displayCutoff.setDate(displayCutoff.getDate() - DISPLAY_DAYS);
	const [allSessions, weightMeasurements, bfMeasurements] = await Promise.all([
		WorkoutSession.find(
			{ createdBy: user.nickname },
			{ 'exercises.exerciseId': 1, 'exercises.sets': 1, 'exercises.totalDistance': 1, kcalEstimate: 1 }
		).lean(),
		// Full history, not just the charted window. The change tiles measure from a
		// date the user picked, which is routinely older than the chart shows — with
		// only the window fetched, "since 1 January" silently became "since 14 days
		// ago" because that was the earliest reading that existed to fall back to.
		// Two fields per row; the cost is bytes, not joins.
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: 1 }).lean(),
		BodyMeasurement.find(
			{ createdBy: user.nickname, bodyFatPercent: { $ne: null } },
			{ date: 1, bodyFatPercent: 1, _id: 0 }
		).sort({ date: 1 }).lean()
	]);
	// Index of the first measurement inside the displayed window (rest is warmup).
	const firstShown = (list: Array<{ date: Date }>) => {
		const i = list.findIndex((m) => new Date(m.date) >= displayCutoff);
		return i === -1 ? list.length : i;
	};

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

	// Split into warmup-only (not displayed) and display portions by date.
	const displayStart = firstShown(weightMeasurements);

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
		const year = isoWeekYear(d);
		const week = isoWeek(d);
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

	// Time-decayed EMA (date-aware) so gaps / irregular spacing don't let stale
	// readings drag the trend — see timeDecayedTrend. Runs over the full history
	// so the displayed window starts already warmed up.
	const allWeightDates = weightMeasurements.map((m) => m.date);
	const weightTrend = timeDecayedTrend(allWeights, allWeightDates);
	for (let idx = displayStart; idx < allWeights.length; idx++) {
		const round = (v: number) => Math.round(v * 100) / 100;
		weightChart.sma.push(round(weightTrend.trend[idx]));
		weightChart.upper.push(round(weightTrend.upper[idx]));
		weightChart.lower.push(round(weightTrend.lower[idx]));
	}

	// Build body-fat chart as Δ from the first displayed point — emphasises
	// relative change over noisy absolute numbers.
	const bfChart: {
		labels: string[];
		dates: string[];
		data: number[];
		sma: (number | null)[];
		upper: (number | null)[];
		lower: (number | null)[];
		baseline: number | null;
	} = { labels: [], dates: [], data: [], sma: [], upper: [], lower: [], baseline: null };

	if (bfMeasurements.length > 0) {
		const allBf: number[] = bfMeasurements.map((m) => m.bodyFatPercent!);
		const displayStartBf = firstShown(bfMeasurements);
		const baseline = allBf[displayStartBf];
		bfChart.baseline = Math.round(baseline * 100) / 100;

		for (let idx = displayStartBf; idx < bfMeasurements.length; idx++) {
			const d = new Date(bfMeasurements[idx].date);
			bfChart.labels.push(
				d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
			);
			bfChart.dates.push(d.toISOString());
			bfChart.data.push(Math.round((allBf[idx] - baseline) * 100) / 100);
		}

		// Same date-aware EMA; output is Δ from the baseline (first shown point).
		const allBfDates = bfMeasurements.map((m) => m.date);
		const bfTrend = timeDecayedTrend(allBf, allBfDates);
		for (let idx = displayStartBf; idx < allBf.length; idx++) {
			const round = (v: number) => Math.round(v * 100) / 100;
			bfChart.sma.push(round(bfTrend.trend[idx] - baseline));
			bfChart.upper.push(round(bfTrend.upper[idx] - baseline));
			bfChart.lower.push(round(bfTrend.lower[idx] - baseline));
		}
	}

	// Series for the change tiles: every reading there has ever been, as absolute
	// trend values. Separate from the charts, which stay at their DISPLAY_DAYS
	// window — the tiles answer "how much since <date>", and that date can be any
	// date, so they cannot be served from a fourteen-day slice.
	//
	// Only dates and the trend line are sent. The delta reads the trend when a
	// series carries one, and the raw points, the ±1σ band and the labels are all
	// chart furniture the tiles never look at.
	const round2 = (v: number) => Math.round(v * 100) / 100;
	const deltaWeightSeries = {
		dates: weightMeasurements.map((m) => new Date(m.date).toISOString()),
		sma: weightTrend.trend.map(round2),
	};
	// baseline 0 so `sma` is read as the absolute percentage: bodyFatDelta computes
	// fat mass from `baseline + value`, which is what the chart's own baseline
	// offset exists to undo.
	const deltaBfSeries =
		bfMeasurements.length > 0
			? {
					dates: bfMeasurements.map((m) => new Date(m.date).toISOString()),
					sma: timeDecayedTrend(
						bfMeasurements.map((m) => m.bodyFatPercent!),
						bfMeasurements.map((m) => m.date)
					).trend.map(round2),
					baseline: 0,
				}
			: { dates: [], sma: [], baseline: 0 };

	return json({
		totalWorkouts,
		totalTonnage: Math.round(totalTonnage / 1000 * 10) / 10,
		totalCardioKm: Math.round(totalCardioKm * 10) / 10,
		kcalEstimate,
		workoutsChart,
		weightChart,
		bfChart,
		deltaWeightSeries,
		deltaBfSeries
	});
};
