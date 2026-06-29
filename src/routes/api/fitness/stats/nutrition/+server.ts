import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { WorkoutSession } from '$models/WorkoutSession';
import { localDateStr, localDateOffset } from '$lib/js/localDate';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Exclude today (incomplete day) — stats cover completed days only.
	// Day keys are stored as UTC-midnight of the *local* calendar-day label
	// (see localDate.ts), so boundaries must be derived from the local date,
	// not from the current UTC instant (which rolls back a day in the small
	// hours for positive-offset timezones).
	const now = new Date();
	const todayStart = new Date(localDateStr() + 'T00:00:00.000Z');
	const sevenDaysAgo = new Date(localDateOffset(-7) + 'T00:00:00.000Z');
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

	// Compute trend weight (SMA of last measurements, same algo as overview)
	// Also build per-date SMA lookup for daily TDEE calculation
	let trendWeight: number | null = null;
	const trendWeightByDate = new Map<string, number>();
	if (weightMeasurements.length > 0) {
		// weightMeasurements sorted chronologically (ascending)
		const allWeights = weightMeasurements.map((m: any) => ({
			date: new Date(m.date).toISOString().slice(0, 10),
			weight: m.weight as number
		}));
		const w = Math.min(7, Math.max(2, Math.floor(allWeights.length / 2)));

		// Compute SMA at each measurement point
		for (let idx = 0; idx < allWeights.length; idx++) {
			const k = Math.min(w, idx + 1);
			let sum = 0;
			for (let j = idx - k + 1; j <= idx; j++) sum += allWeights[j].weight;
			const sma = Math.round((sum / k) * 100) / 100;
			trendWeightByDate.set(allWeights[idx].date, sma);
		}

		// Latest trend weight (for protein/kg and fallback)
		const lastIdx = allWeights.length - 1;
		const k = Math.min(w, lastIdx + 1);
		let sum = 0;
		for (let j = lastIdx - k + 1; j <= lastIdx; j++) sum += allWeights[j].weight;
		trendWeight = Math.round((sum / k) * 100) / 100;
	}

	/** Get trend weight for a date: exact match or most recent prior measurement's SMA */
	function getTrendWeightForDate(dateStr: string): number | null {
		if (trendWeightByDate.has(dateStr)) return trendWeightByDate.get(dateStr)!;
		// Find the latest measurement on or before this date
		let latest: number | null = null;
		for (const [d, tw] of trendWeightByDate) {
			if (d <= dateStr) latest = tw;
		}
		return latest;
	}

	// Group entries by date string
	const byDate = new Map<string, typeof entries30d>();
	for (const entry of entries30d) {
		const key = new Date(entry.date).toISOString().slice(0, 10);
		if (!byDate.has(key)) byDate.set(key, []);
		byDate.get(key)!.push(entry);
	}

	// Compute daily totals
	const dailyTotals: { date: string; calories: number; protein: number; fat: number; carbs: number }[] = [];
	for (const [date, dayEntries] of byDate) {
		let calories = 0, protein = 0, fat = 0, carbs = 0;
		for (const e of dayEntries) {
			const mult = (e.amountGrams ?? 0) / 100;
			calories += (e.per100g?.calories ?? 0) * mult;
			protein += (e.per100g?.protein ?? 0) * mult;
			fat += (e.per100g?.fat ?? 0) * mult;
			carbs += (e.per100g?.carbs ?? 0) * mult;
		}
		dailyTotals.push({ date, calories, protein, fat, carbs });
	}

	const dailyCalorieGoal = goal?.dailyCalories ?? null;

	// NEAT-only multipliers (lower than standard TDEE multipliers because
	// we add tracked workout kcal separately to avoid double-counting)
	const neatMultipliers: Record<string, number> = {
		sedentary: 1.2, light: 1.3, moderate: 1.4, very_active: 1.5
	};
	const neatMult = neatMultipliers[goal?.activityLevel ?? 'light'] ?? 1.3;
	const canComputeTdee = !!(goal?.heightCm && goal?.birthYear && trendWeight);

	/** Compute daily TDEE using per-day trend weight */
	function getDailyTdee(dateStr: string): number | null {
		if (!canComputeTdee) return null;
		const dayWeight = getTrendWeightForDate(dateStr);
		if (!dayWeight) return null;
		const age = now.getFullYear() - goal.birthYear;
		const bmr = 10 * dayWeight + 6.25 * goal.heightCm - 5 * age + (goal.sex === 'female' ? -161 : 5);
		return bmr * neatMult;
	}

	// Group workout kcal by date for the 30-day window
	const workoutKcalByDate = new Map<string, number>();
	for (const s of workoutSessions30d) {
		const key = new Date(s.startTime).toISOString().slice(0, 10);
		workoutKcalByDate.set(key, (workoutKcalByDate.get(key) ?? 0) + (s.kcalEstimate?.kcal ?? 0));
	}

	// 7-day averages — only over days with non-zero logged intake, so untracked
	// days don't skew the balance toward an artificial deficit.
	const sevenDayStr = sevenDaysAgo.toISOString().slice(0, 10);
	const recent7 = dailyTotals.filter(d => d.date >= sevenDayStr && d.calories > 0);

	let avgProteinPerKg: number | null = null;
	let avgCalorieBalance: number | null = null;
	let avgDailyExpenditure: number | null = null;
	let macroSplit: { protein: number; fat: number; carbs: number } | null = null;

	if (recent7.length > 0) {
		const avgProtein = recent7.reduce((s, d) => s + d.protein, 0) / recent7.length;
		const avgCalories = recent7.reduce((s, d) => s + d.calories, 0) / recent7.length;
		const avgFat = recent7.reduce((s, d) => s + d.fat, 0) / recent7.length;
		const avgCarbs = recent7.reduce((s, d) => s + d.carbs, 0) / recent7.length;

		if (trendWeight) {
			avgProteinPerKg = Math.round((avgProtein / trendWeight) * 100) / 100;
		}

		// Calorie balance: intake minus expenditure, averaged over the same
		// logged days (not all 7 calendar days) so the two sides compare apples
		// to apples.
		if (canComputeTdee) {
			let totalExpenditure = 0;
			let expenditureDays = 0;
			for (const d of recent7) {
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
		const proteinCal = avgProtein * 4;
		const fatCal = avgFat * 9;
		const carbsCal = avgCarbs * 4;
		const totalCal = proteinCal + fatCal + carbsCal;
		if (totalCal > 0) {
			macroSplit = {
				protein: Math.round(proteinCal / totalCal * 100),
				fat: Math.round(fatCal / totalCal * 100),
				carbs: 100 - Math.round(proteinCal / totalCal * 100) - Math.round(fatCal / totalCal * 100),
			};
		}
	}

	// Adherence: % of days within ±10% of calorie goal.
	// Range: from first tracked day (within 30-day window) to today.
	// Untracked days between first tracked day and today count as misses.
	let adherencePercent: number | null = null;
	let adherenceDays: number | null = null;
	if (dailyCalorieGoal && dailyTotals.length > 0) {
		const sortedDates = dailyTotals.map(d => d.date).sort();
		const firstTracked = sortedDates[0];
		// Count calendar days from first tracked day to yesterday (inclusive)
		const firstDate = new Date(firstTracked + 'T00:00:00Z');
		const yesterday = new Date(todayStart);
		yesterday.setUTCDate(yesterday.getUTCDate() - 1);
		const totalDays = Math.round((yesterday.getTime() - firstDate.getTime()) / 86400000) + 1;

		const withinRange = dailyTotals.filter(d => {
			const dayGoal = dailyCalorieGoal + (workoutKcalByDate.get(d.date) ?? 0);
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
	if (goal && dailyCalorieGoal && recent7.length > 0) {
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
		for (const d of recent7) {
			const pGrams = proteinGramsForDate(d.date);
			if (pGrams == null) continue;
			const calorieGoal = dailyCalorieGoal + (workoutKcalByDate.get(d.date) ?? 0);
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
		daysTracked7: recent7.length,
		daysTracked30: dailyTotals.length,
	});
};
