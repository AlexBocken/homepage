import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { WorkoutSession } from '$models/WorkoutSession';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Exclude today (incomplete day) — stats cover completed days only
	const now = new Date();
	const todayStart = new Date(now);
	todayStart.setUTCHours(0, 0, 0, 0);

	const sevenDaysAgo = new Date(todayStart);
	sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

	const thirtyDaysAgo = new Date(todayStart);
	thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

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
		).sort({ date: 1 }).lean() as any[],
		WorkoutSession.find(
			{ createdBy: user.nickname, startTime: { $gte: thirtyDaysAgo, $lt: todayStart }, 'kcalEstimate.kcal': { $gt: 0 } },
			{ startTime: 1, 'kcalEstimate.kcal': 1, _id: 0 }
		).lean() as any[],
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

	// 7-day averages (only days with logged entries)
	const sevenDayStr = sevenDaysAgo.toISOString().slice(0, 10);
	const recent7 = dailyTotals.filter(d => d.date >= sevenDayStr);

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

		// Calorie balance: intake minus estimated expenditure (per-day TDEE + workout kcal)
		if (canComputeTdee) {
			// Build all 7 calendar days and compute expenditure for each
			let totalExpenditure = 0;
			let expenditureDays = 0;
			for (let i = 1; i <= 7; i++) {
				const d = new Date(todayStart);
				d.setUTCDate(d.getUTCDate() - i);
				const dateStr = d.toISOString().slice(0, 10);
				const dayTdee = getDailyTdee(dateStr);
				if (dayTdee != null) {
					totalExpenditure += dayTdee + (workoutKcalByDate.get(dateStr) ?? 0);
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

	// Macro targets from goal — protein gets priority, remaining kcal split
	// between fat and carbs proportionally to the stored fat:carb ratio.
	let macroTargets: { protein: number | null; fat: number | null; carbs: number | null } = {
		protein: null, fat: null, carbs: null
	};
	if (goal && dailyCalorieGoal) {
		let proteinGrams: number | null = null;
		if (goal.proteinTarget) {
			proteinGrams = goal.proteinTarget;
			if (goal.proteinMode === 'per_kg' && trendWeight) {
				proteinGrams = goal.proteinTarget * trendWeight;
			}
		}
		if (proteinGrams != null) {
			const proteinPct = Math.min(Math.round((proteinGrams * 4) / dailyCalorieGoal * 100), 100);
			macroTargets.protein = proteinPct;
			const remainingPct = 100 - proteinPct;
			const fatRatio = goal.fatPercent ?? 0;
			const carbRatio = goal.carbPercent ?? 0;
			const ratioSum = fatRatio + carbRatio;
			if (ratioSum > 0) {
				macroTargets.fat = Math.round(remainingPct * fatRatio / ratioSum);
				macroTargets.carbs = remainingPct - macroTargets.fat;
			}
		} else {
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
