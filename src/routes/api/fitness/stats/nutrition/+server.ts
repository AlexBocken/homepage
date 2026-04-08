import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
	sevenDaysAgo.setUTCHours(0, 0, 0, 0);

	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
	thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

	const todayEnd = new Date(now);
	todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
	todayEnd.setUTCHours(0, 0, 0, 0);

	const [entries30d, goal, weightMeasurements] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: thirtyDaysAgo, $lt: todayEnd },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: -1 }).limit(14).lean() as any[],
	]);

	// Compute trend weight (SMA of last measurements, same algo as overview)
	let trendWeight: number | null = null;
	if (weightMeasurements.length > 0) {
		const weights = weightMeasurements.slice().reverse().map((m: any) => m.weight as number);
		const w = Math.min(7, Math.max(2, Math.floor(weights.length / 2)));
		const lastIdx = weights.length - 1;
		const k = Math.min(w, lastIdx + 1);
		let sum = 0;
		for (let j = lastIdx - k + 1; j <= lastIdx; j++) sum += weights[j];
		trendWeight = Math.round((sum / k) * 100) / 100;
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

	// 7-day averages (only days with logged entries)
	const sevenDayStr = sevenDaysAgo.toISOString().slice(0, 10);
	const recent7 = dailyTotals.filter(d => d.date >= sevenDayStr);

	let avgProteinPerKg: number | null = null;
	let avgCalorieBalance: number | null = null;
	let macroSplit: { protein: number; fat: number; carbs: number } | null = null;

	if (recent7.length > 0) {
		const avgProtein = recent7.reduce((s, d) => s + d.protein, 0) / recent7.length;
		const avgCalories = recent7.reduce((s, d) => s + d.calories, 0) / recent7.length;
		const avgFat = recent7.reduce((s, d) => s + d.fat, 0) / recent7.length;
		const avgCarbs = recent7.reduce((s, d) => s + d.carbs, 0) / recent7.length;

		if (trendWeight) {
			avgProteinPerKg = Math.round((avgProtein / trendWeight) * 100) / 100;
		}

		if (dailyCalorieGoal) {
			avgCalorieBalance = Math.round(avgCalories - dailyCalorieGoal);
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
		const todayStr = now.toISOString().slice(0, 10);
		// Count calendar days from first tracked day to today (inclusive)
		const firstDate = new Date(firstTracked + 'T00:00:00Z');
		const todayDate = new Date(todayStr + 'T00:00:00Z');
		const totalDays = Math.round((todayDate.getTime() - firstDate.getTime()) / 86400000) + 1;

		const lower = dailyCalorieGoal * 0.9;
		const upper = dailyCalorieGoal * 1.1;
		const withinRange = dailyTotals.filter(d => d.calories >= lower && d.calories <= upper).length;
		adherenceDays = totalDays;
		adherencePercent = Math.round(withinRange / totalDays * 100);
	}

	// Macro targets from goal
	let macroTargets: { protein: number | null; fat: number | null; carbs: number | null } = {
		protein: null, fat: null, carbs: null
	};
	if (goal) {
		// Compute protein percent of calories
		if (goal.proteinTarget && dailyCalorieGoal) {
			let proteinGrams = goal.proteinTarget;
			if (goal.proteinMode === 'per_kg' && trendWeight) {
				proteinGrams = goal.proteinTarget * trendWeight;
			}
			macroTargets.protein = Math.round((proteinGrams * 4) / dailyCalorieGoal * 100);
		}
		if (goal.fatPercent != null) macroTargets.fat = goal.fatPercent;
		if (goal.carbPercent != null) macroTargets.carbs = goal.carbPercent;
	}

	return json({
		avgProteinPerKg,
		avgCalorieBalance,
		adherencePercent,
		adherenceDays,
		macroSplit,
		macroTargets,
		trendWeight,
		daysTracked7: recent7.length,
		daysTracked30: dailyTotals.length,
	});
};
