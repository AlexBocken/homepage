import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { WorkoutSchedule } from '$models/WorkoutSchedule';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { Recipe } from '$models/Recipe';
import { RoundOffCache } from '$models/RoundOffCache';
import mongoose from 'mongoose';

export const load: PageServerLoad = async ({ fetch, params, locals }) => {
	const dateParam = params.date || new Date().toISOString().slice(0, 10);

	// Run all independent work in parallel: 3 API calls + workout kcal DB query
	const dayStart = new Date(dateParam + 'T00:00:00.000Z');
	const dayEnd = new Date(dateParam + 'T23:59:59.999Z');
	const todayStr = new Date().toISOString().slice(0, 10);
	const isFuture = dateParam > todayStr;

	const exercisePromise = (async () => {
		try {
			const user = await requireAuth(locals);
			await dbConnect();
			const [sessions, schedule] = await Promise.all([
				WorkoutSession.find({
					createdBy: user.nickname,
					startTime: { $gte: dayStart, $lte: dayEnd }
				}).select('kcalEstimate').lean(),
				isFuture ? WorkoutSchedule.findOne({ userId: user.nickname }).lean() : Promise.resolve(null)
			]);
			let kcal = 0;
			for (const s of sessions) {
				if (s.kcalEstimate?.kcal) kcal += s.kcalEstimate.kcal;
			}

			// For future days without exercise, project kcal from the next scheduled template
			let projected = null;
			if (kcal === 0 && isFuture) {
				if (schedule?.templateOrder?.length) {
					const lastScheduled = await WorkoutSession.findOne({
						createdBy: user.nickname,
						templateId: { $in: schedule.templateOrder }
					}).sort({ startTime: -1 }).select('templateId').lean();

					let nextId;
					if (!lastScheduled?.templateId) {
						nextId = schedule.templateOrder[0];
					} else {
						const idx = schedule.templateOrder.indexOf(lastScheduled.templateId.toString());
						nextId = schedule.templateOrder[(idx === -1 ? 0 : idx + 1) % schedule.templateOrder.length];
					}

					const prevSession = await WorkoutSession.findOne({
						createdBy: user.nickname,
						templateId: nextId,
						'kcalEstimate.kcal': { $gt: 0 }
					}).sort({ startTime: -1 }).select('kcalEstimate templateName').lean();

					if (prevSession?.kcalEstimate?.kcal) {
						const tmpl = await WorkoutTemplate.findById(nextId).select('name').lean();
						projected = {
							kcal: Math.round(prevSession.kcalEstimate.kcal),
							templateName: tmpl?.name || prevSession.templateName || '?',
						};
					}
				}
			}

			return { kcal, projected };
		} catch { return { kcal: 0, projected: null }; }
	})();

	const recentFrom = new Date();
	recentFrom.setDate(recentFrom.getDate() - 3);
	const recentFromStr = recentFrom.toISOString().slice(0, 10);

	const [foodRes, goalRes, weightRes, exerciseData, favRes, recentRes] = await Promise.all([
		fetch(`/api/fitness/food-log?date=${dateParam}`),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest'),
		exercisePromise,
		fetch('/api/fitness/favorite-ingredients'),
		fetch(`/api/fitness/food-log?from=${recentFromStr}&to=${todayStr}`),
	]);

	const foodLog = foodRes.ok ? await foodRes.json() : { entries: [] };

	// Resolve recipe images for entries with source=recipe
	const recipeImages: Record<string, string> = {};
	const recipeIds = foodLog.entries
		?.filter((e: any) => e.source === 'recipe' && e.sourceId)
		.map((e: any) => e.sourceId)
		.filter((id: string) => mongoose.Types.ObjectId.isValid(id));

	if (recipeIds?.length > 0) {
		try {
			await dbConnect();
			const recipes = await Recipe.find(
				{ _id: { $in: [...new Set(recipeIds)] } as any },
				{ _id: 1, short_name: 1, 'images.mediapath': 1 }
			).lean();
			for (const r of recipes as any[]) {
				const mediapath = r.images?.[0]?.mediapath;
				if (mediapath) {
					recipeImages[String(r._id)] = `https://bocken.org/static/rezepte/thumb/${mediapath}`;
				}
			}
		} catch {}
	}

	// Try to load cached round-off suggestions for SSR (no loading flash)
	let roundOffSuggestions = null;
	try {
		const today = new Date().toISOString().slice(0, 10);
		if (dateParam === today) {
			const user = await requireAuth(locals);
			await dbConnect();
			const cached = await RoundOffCache.findOne({ createdBy: user.nickname, date: today }).lean();
			if (cached?.suggestions?.length && cached.suggestions[0]?.items) {
				roundOffSuggestions = {
					suggestions: cached.suggestions,
					foodPoolCount: cached.foodPoolCount,
					recipeCount: cached.recipeCount,
				};
			}
		}
	} catch {}

	const favData = favRes.ok ? await favRes.json() : { favorites: [] };
	const recentData = recentRes.ok ? await recentRes.json() : { entries: [] };

	// Deduplicate recent foods
	const seen = new Set<string>();
	const recentFoods = (recentData.entries ?? [])
		.filter((e: any) => e.mealType !== 'water' && e.source && e.sourceId)
		.reverse()
		.filter((e: any) => {
			const key = `${e.source}:${e.sourceId}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.slice(0, 10);

	const goal = goalRes.ok ? await goalRes.json() : {};
	const roundedExerciseKcal = Math.round(exerciseData.kcal);
	const projectedExercise = exerciseData.projected;

	// Compute initial showRoundOff server-side to avoid flicker
	const today = new Date().toISOString().slice(0, 10);
	const isTodayOrFuture = dateParam >= today;
	let initialShowRoundOff = false;
	if (isTodayOrFuture && goal.dailyCalories) {
		const totalCal = (foodLog.entries ?? []).reduce(
			(sum: number, e: any) => sum + ((e.per100g?.calories ?? 0) * e.amountGrams / 100), 0
		);
		const balance = goal.dailyCalories + (roundedExerciseKcal || 0) - totalCal;
		initialShowRoundOff = balance > 50 && balance <= goal.dailyCalories * 0.5;
	}

	return {
		date: dateParam,
		foodLog,
		goal,
		latestWeight: weightRes.ok ? await weightRes.json() : {},
		exerciseKcal: roundedExerciseKcal,
		projectedExercise,
		recipeImages,
		favorites: favData.favorites ?? [],
		recentFoods,
		roundOffSuggestions,
		initialShowRoundOff,
	};
};
