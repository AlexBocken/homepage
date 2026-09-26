import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { resolveEntries } from '$lib/server/foodLogComponents';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { WorkoutSession } from '$models/WorkoutSession';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { buildTrendWeightLookup, canEstimateTdee, dailyTotals as sumDailyTotals, tdeeForDay } from '$lib/fitness/bodyTrend';
import { macroCaloriePercent } from '$lib/fitness/nutritionMath';
import { backfillDailyTargets, calorieTargetsInRange } from '$lib/server/dailyTargets';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Exclude today (incomplete day) — stats cover completed days only.
	// Day keys are stored as UTC-midnight of the *local* calendar-day label
	// (see localDate.ts), so boundaries must be derived from the local date,
	// not from the current UTC instant (which rolls back a day in the small
	// hours for positive-offset timezones).
	const now = new Date();
	const todayStart = new Date(localDateStr() + 'T00:00:00.000Z');
	// Averaging window: 7 days by default, 30 when the caller asks for it
	// (the nutrients page toggles between the two).
	const windowDays = url.searchParams.get('days') === '30' ? 30 : 7;
	const windowStart = new Date(localDateOffset(-windowDays) + 'T00:00:00.000Z');
	const thirtyDaysAgo = new Date(localDateOffset(-30) + 'T00:00:00.000Z');

	const [entries30d, goal, weightMeasurements, workoutSessions30d] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: thirtyDaysAgo, $lt: todayStart },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: 1 }).lean() as unknown as any[],
		WorkoutSession.find(
			{ createdBy: user.nickname, startTime: { $gte: thirtyDaysAgo, $lt: todayStart }, 'kcalEstimate.kcal': { $gt: 0 } },
			{ startTime: 1, 'kcalEstimate.kcal': 1, _id: 0 }
		).lean() as unknown as any[],
	]);

	// Trend weight (SMA of the weigh-ins, same algo as overview) plus the per-date
	// lookup behind each day's TDEE.
	const trend = buildTrendWeightLookup(weightMeasurements);
	const trendWeight = trend.latest;
	const getTrendWeightForDate = trend.on;

	// Resolve reference entries to live nutrition (blended per100g + derived
	// amountGrams); only macros are read below, which the blend reproduces exactly.
	const entriesResolved = await resolveEntries(entries30d as any[]);

	// Daily totals
	const dailyTotals: { date: string; calories: number; protein: number; fat: number; carbs: number }[] = [
		...sumDailyTotals(entriesResolved, ['calories', 'protein', 'fat', 'carbs'] as const)
	].map(([date, t]) => ({ date, ...t }));

	const dailyCalorieGoal = goal?.dailyCalories ?? null;

	// Adherence is judged per day against the goal that was live *that* day, so a
	// goal change doesn't invalidate the history. Logged days without a stored
	// target get today's goal written for them now (see $lib/server/dailyTargets).
	await backfillDailyTargets(user.nickname, dailyCalorieGoal);
	const calorieTargets = await calorieTargetsInRange(
		user.nickname,
		thirtyDaysAgo.toISOString().slice(0, 10),
		localDateOffset(-1),
	);
	const goalForDate = (dateStr: string): number | null =>
		calorieTargets.get(dateStr) ?? dailyCalorieGoal;

	const canComputeTdee = canEstimateTdee(goal) && !!trendWeight;
	const year = now.getFullYear();

	/** Compute daily TDEE using per-day trend weight */
	function getDailyTdee(dateStr: string): number | null {
		if (!canComputeTdee) return null;
		return tdeeForDay(getTrendWeightForDate(dateStr), goal, year);
	}

	// Group workout kcal by date for the 30-day window
	const workoutKcalByDate = new Map<string, number>();
	for (const s of workoutSessions30d) {
		const key = new Date(s.startTime).toISOString().slice(0, 10);
		workoutKcalByDate.set(key, (workoutKcalByDate.get(key) ?? 0) + (s.kcalEstimate?.kcal ?? 0));
	}

	// Window averages — only over days with non-zero logged intake, so untracked
	// days don't skew the balance toward an artificial deficit.
	const windowStartStr = windowStart.toISOString().slice(0, 10);
	const recentDays = dailyTotals.filter(d => d.date >= windowStartStr && d.calories > 0);

	let avgProteinPerKg: number | null = null;
	let avgCalorieBalance: number | null = null;
	let avgDailyExpenditure: number | null = null;
	let macroSplit: { protein: number; fat: number; carbs: number } | null = null;

	if (recentDays.length > 0) {
		const avgProtein = recentDays.reduce((s, d) => s + d.protein, 0) / recentDays.length;
		const avgCalories = recentDays.reduce((s, d) => s + d.calories, 0) / recentDays.length;
		const avgFat = recentDays.reduce((s, d) => s + d.fat, 0) / recentDays.length;
		const avgCarbs = recentDays.reduce((s, d) => s + d.carbs, 0) / recentDays.length;

		if (trendWeight) {
			avgProteinPerKg = Math.round((avgProtein / trendWeight) * 100) / 100;
		}

		// Calorie balance: intake minus expenditure, averaged over the same
		// logged days (not all 7 calendar days) so the two sides compare apples
		// to apples.
		if (canComputeTdee) {
			let totalExpenditure = 0;
			let expenditureDays = 0;
			for (const d of recentDays) {
				const dayTdee = getDailyTdee(d.date);
				if (dayTdee != null) {
					totalExpenditure += dayTdee + (workoutKcalByDate.get(d.date) ?? 0);
					expenditureDays++;
				}
			}
			if (expenditureDays > 0) {
				avgDailyExpenditure = Math.round(totalExpenditure / expenditureDays);
				avgCalorieBalance = Math.round(avgCalories - avgDailyExpenditure);
			}
		}

		// Macro split by calorie contribution
		if (avgProtein * 4 + avgFat * 9 + avgCarbs * 4 > 0) {
			macroSplit = macroCaloriePercent({ protein: avgProtein, fat: avgFat, carbs: avgCarbs });
		}
	}

	// Adherence: % of days within ±10% of that day's calorie goal.
	// Range: from first tracked day (within 30-day window) to today.
	// Untracked days between first tracked day and today count as misses.
	let adherencePercent: number | null = null;
	let adherenceDays: number | null = null;
	if ((dailyCalorieGoal || calorieTargets.size > 0) && dailyTotals.length > 0) {
		const sortedDates = dailyTotals.map(d => d.date).sort();
		const firstTracked = sortedDates[0];
		// Count calendar days from first tracked day to yesterday (inclusive)
		const firstDate = new Date(firstTracked + 'T00:00:00Z');
		const yesterday = new Date(todayStart);
		yesterday.setUTCDate(yesterday.getUTCDate() - 1);
		const totalDays = Math.round((yesterday.getTime() - firstDate.getTime()) / 86400000) + 1;

		const withinRange = dailyTotals.filter(d => {
			const target = goalForDate(d.date);
			if (target == null) return false;
			const dayGoal = target + (workoutKcalByDate.get(d.date) ?? 0);
			return d.calories >= dayGoal * 0.9 && d.calories <= dayGoal * 1.1;
		}).length;
		adherenceDays = totalDays;
		adherencePercent = Math.round(withinRange / totalDays * 100);
	}

	// Macro targets — averaged the same way as the actual split, and over the same
	// logged days. The per-day target moves: protein grams scale with that day's
	// trend weight, and the calorie allowance grows by that day's workout kcal
	// (the extra flows into fat/carb, matching the daily nutrition page). So we
	// sum the underlying daily target *calories* per macro and only THEN take the
	// percentage split — never average the daily percentages. Protein gets
	// priority; the remaining kcal split by the stored fat:carb ratio.
	let macroTargets: { protein: number | null; fat: number | null; carbs: number | null } = {
		protein: null, fat: null, carbs: null
	};
	if (goal && dailyCalorieGoal && recentDays.length > 0) {
		const fatRatio = goal.fatPercent ?? 0;
		const carbRatio = goal.carbPercent ?? 0;
		const ratioSum = fatRatio + carbRatio;

		/** Per-day target protein grams (per-kg mode uses that day's trend weight). */
		const proteinGramsForDate = (dateStr: string): number | null => {
			if (!goal.proteinTarget) return null;
			if (goal.proteinMode === 'per_kg') {
				const w = getTrendWeightForDate(dateStr) ?? trendWeight;
				return w ? goal.proteinTarget * w : null;
			}
			return goal.proteinTarget; // fixed grams/day
		};

		// Accumulate each logged day's target calories per macro. Protein calories
		// come from its weight-based grams; the rest of that day's allowance
		// (base goal + workout kcal) splits into fat/carb by the fat:carb ratio.
		let sumProteinCal = 0, sumFatCal = 0, sumCarbCal = 0, days = 0;
		for (const d of recentDays) {
			const pGrams = proteinGramsForDate(d.date);
			if (pGrams == null) continue;
			const dayTarget = goalForDate(d.date);
			if (dayTarget == null) continue;
			const calorieGoal = dayTarget + (workoutKcalByDate.get(d.date) ?? 0);
			const remainingCal = Math.max(0, calorieGoal - pGrams * 4);
			sumProteinCal += pGrams * 4;
			sumFatCal += ratioSum > 0 ? remainingCal * fatRatio / ratioSum : 0;
			sumCarbCal += ratioSum > 0 ? remainingCal * carbRatio / ratioSum : 0;
			days++;
		}

		if (days > 0) {
			const total = sumProteinCal + sumFatCal + sumCarbCal;
			if (total > 0) {
				macroTargets.protein = Math.min(Math.round(sumProteinCal / total * 100), 100);
				macroTargets.fat = Math.round(sumFatCal / total * 100);
				macroTargets.carbs = 100 - macroTargets.protein - macroTargets.fat;
			}
		} else {
			// No usable protein target → fall back to the static fat/carb split.
			if (goal.fatPercent != null) macroTargets.fat = goal.fatPercent;
			if (goal.carbPercent != null) macroTargets.carbs = goal.carbPercent;
		}
	}

	return json({
		avgProteinPerKg,
		avgCalorieBalance,
		avgDailyExpenditure,
		adherencePercent,
		adherenceDays,
		macroSplit,
		macroTargets,
		trendWeight,
		daysTracked7: recentDays.length,
		daysTracked30: dailyTotals.length,
	});
};
