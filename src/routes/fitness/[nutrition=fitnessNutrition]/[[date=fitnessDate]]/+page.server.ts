import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { getNextScheduledTemplate } from '$lib/server/workoutSchedule';
import { Recipe } from '$models/Recipe';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { recipeThumbUrl } from '$lib/utils/recipeImage';
import { calorieTargetForDate, stampDailyTargets } from '$lib/server/dailyTargets';
import { trendValueOn } from '$lib/fitness/trend';
import mongoose from 'mongoose';

export const load: PageServerLoad = async ({ fetch, params, locals }) => {
	const dateParam = params.date || localDateStr();

	// Run all independent work in parallel: 3 API calls + workout kcal DB query
	const dayStart = new Date(dateParam + 'T00:00:00.000Z');
	const dayEnd = new Date(dateParam + 'T23:59:59.999Z');
	const todayStr = localDateStr();
	const isTodayOrFuture = dateParam >= todayStr;

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

			// For today or future days without logged exercise, project kcal from the next scheduled
			// template, using the same rotation logic as /fitness/workout.
			let projected = null;
			if (kcal === 0 && isTodayOrFuture) {
				const { nextTemplateId } = await getNextScheduledTemplate(user.nickname);
				if (nextTemplateId) {
					const prevSession = await WorkoutSession.findOne({
						createdBy: user.nickname,
						templateId: nextTemplateId,
						'kcalEstimate.kcal': { $gt: 0 }
					}).sort({ startTime: -1 }).select('kcalEstimate templateName').lean();

					if (prevSession?.kcalEstimate?.kcal) {
						const tmpl = await WorkoutTemplate.findById(nextTemplateId).select('name').lean();
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

	// The goal this particular day was eaten against. Past days keep theirs when the
	// target later moves, so the rings and the adherence grid agree.
	const dayTargetPromise = (async () => {
		try {
			const user = await requireAuth(locals);
			await dbConnect();
			return await calorieTargetForDate(user.nickname, dateParam);
		} catch { return null; }
	})();

	const recentFromStr = localDateOffset(-7);

	// "Finish your day" used to be fetched from the browser after hydration, which meant
	// the card could only ever appear a beat after the page. It is requested here
	// instead, so it is in the first paint. It rides in this same wave rather than
	// after it: the endpoint derives the remaining macros itself when they are not
	// passed, so this does not have to wait for the goal and food log to come back.
	// Past days get nothing — they cannot be added to — so they don't pay for it.
	const nudgesPromise = isTodayOrFuture
		? fetch(`/api/fitness/nudges?date=${dateParam}`)
			.then(r => (r.ok ? r.json() : null))
			.catch(() => null)
		: Promise.resolve(null);

	const [foodRes, goalRes, weightRes, weightHistoryRes, exerciseData, favRes, recentRes, dayCalorieGoal, nudgeData] = await Promise.all([
		fetch(`/api/fitness/food-log?date=${dateParam}`),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest'),
		// Weights up to and including the viewed day. A per-kg protein goal has to be
		// read against the weight you were then; `to` keeps anything later out of the
		// trend entirely rather than trusting the client to ignore it.
		fetch(`/api/fitness/measurements?to=${dateParam}&limit=2000`),
		exercisePromise,
		fetch('/api/fitness/favorite-ingredients'),
		fetch(`/api/fitness/food-log?from=${recentFromStr}&to=${todayStr}`),
		dayTargetPromise,
		nudgesPromise,
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
					recipeImages[String(r._id)] = recipeThumbUrl(mediapath);
				}
			}
		} catch {}
	}

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
		.slice(0, 20);

	const goal = goalRes.ok ? await goalRes.json() : {};
	const roundedExerciseKcal = Math.round(exerciseData.kcal);
	const projectedExercise = exerciseData.projected;

	// A day with food but no stored target predates them: write the current goal for
	// it now instead of only assuming it on read, so the next goal change leaves it
	// alone (see $lib/server/dailyTargets).
	if (dayCalorieGoal == null && (foodLog.entries ?? []).some((e: any) => e.mealType !== 'water')) {
		requireAuth(locals)
			.then(u => stampDailyTargets(u.nickname, [dateParam]))
			.catch(() => {});
	}

	// What the weight trend said on the viewed day, for a per-kg protein goal.
	// Null when nothing had been weighed yet, in which case the page falls back to
	// the latest reading — the old behaviour, and the best guess available.
	const weightHistory = weightHistoryRes.ok ? await weightHistoryRes.json() : { measurements: [] };
	const trendWeight = trendValueOn(
		(weightHistory.measurements ?? [])
			.filter((m: { weight?: number | null }) => m.weight != null)
			.map((m: { date: string; weight: number }) => ({ date: m.date, value: m.weight })),
		dateParam
	);

	return {
		date: dateParam,
		foodLog,
		goal,
		dayCalorieGoal,
		trendWeight,
		latestWeight: weightRes.ok ? await weightRes.json() : {},
		exerciseKcal: roundedExerciseKcal,
		projectedExercise,
		recipeImages,
		favorites: favData.favorites ?? [],
		recentFoods,
		nudges: nudgeData?.nudges ?? [],
		// What those nudges were built from, so the client can tell whether its own live
		// numbers still agree and skip an identical refetch on hydration.
		nudgesRemaining: nudgeData?.remaining ?? null,
	};
};
