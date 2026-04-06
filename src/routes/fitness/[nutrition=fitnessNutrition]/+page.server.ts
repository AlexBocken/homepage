import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { Recipe } from '$models/Recipe';
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

	const [foodRes, goalRes, weightRes, exerciseKcal] = await Promise.all([
		fetch(`/api/fitness/food-log?date=${dateParam}`),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest'),
		exercisePromise
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

	return {
		date: dateParam,
		foodLog,
		goal: goalRes.ok ? await goalRes.json() : {},
		latestWeight: weightRes.ok ? await weightRes.json() : {},
		exerciseKcal: Math.round(exerciseKcal),
		recipeImages,
	};
};
