import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { Recipe } from '$models/Recipe';
import { RoundOffCache } from '$models/RoundOffCache';
import mongoose from 'mongoose';

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
	const dateParam = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

	// Run all independent work in parallel: 3 API calls + workout kcal DB query
	const dayStart = new Date(dateParam + 'T00:00:00.000Z');
	const dayEnd = new Date(dateParam + 'T23:59:59.999Z');

	const exercisePromise = (async () => {
		try {
			const user = await requireAuth(locals);
			await dbConnect();
			const sessions = await WorkoutSession.find({
				createdBy: user.nickname,
				startTime: { $gte: dayStart, $lte: dayEnd }
			}).select('kcalEstimate').lean();
			let kcal = 0;
			for (const s of sessions) {
				if (s.kcalEstimate?.kcal) kcal += s.kcalEstimate.kcal;
			}
			return kcal;
		} catch { return 0; }
	})();

	const recentFrom = new Date();
	recentFrom.setDate(recentFrom.getDate() - 3);
	const recentFromStr = recentFrom.toISOString().slice(0, 10);
	const todayStr = new Date().toISOString().slice(0, 10);

	const [foodRes, goalRes, weightRes, exerciseKcal, favRes, recentRes] = await Promise.all([
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
	const roundedExerciseKcal = Math.round(exerciseKcal);

	// Compute initial showRoundOff server-side to avoid flicker
	const today = new Date().toISOString().slice(0, 10);
	const isToday = dateParam === today;
	let initialShowRoundOff = false;
	if (isToday && goal.dailyCalories) {
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
		recipeImages,
		favorites: favData.favorites ?? [],
		recentFoods,
		roundOffSuggestions,
		initialShowRoundOff,
	};
};
