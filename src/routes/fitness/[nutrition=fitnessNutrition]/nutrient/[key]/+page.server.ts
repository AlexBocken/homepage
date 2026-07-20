import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import {
	getDRI, aminoDri, AMINO_DRI_REFERENCE_WEIGHT, NUTRIENT_META,
} from '$lib/data/dailyReferenceIntake';
import { CustomMeal } from '$models/CustomMeal';
import {
	nutrientContributions, nutrientMeta, isKnownNutrient, expandCustomMeals,
} from '$lib/fitness/nutrientContributions';

/**
 * Which foods supplied one nutrient, either on a single day or averaged over the
 * same 7/30-day window the stats page uses.
 *
 * The two modes exist because the two pages that link here ask different questions:
 * the diary wants "what made up today's vitamin A", the averages page wants "what
 * usually does". `days` selects the range mode and takes precedence over `date`.
 */
export const load: PageServerLoad = async ({ params, url, locals }) => {
	const key = params.key;
	if (!isKnownNutrient(key)) throw error(404, 'Unknown nutrient');

	const meta = nutrientMeta(key)!;
	const sortBy = url.searchParams.get('by') === 'per100g' ? 'per100g' : 'amount';

	const daysParam = url.searchParams.get('days');
	const isRange = daysParam === '7' || daysParam === '30';
	const days = daysParam === '30' ? 30 : 7;

	const user = await requireAuth(locals);
	await dbConnect();

	// Day keys are stored at UTC midnight of the *local* calendar day, so both
	// windows are derived from the local date. The range excludes today for the same
	// reason the stats page does: a part-finished day would drag every average down.
	let start: Date;
	let end: Date;
	let dateStr: string | null = null;
	if (isRange) {
		start = new Date(localDateOffset(-days) + 'T00:00:00.000Z');
		end = new Date(localDateStr() + 'T00:00:00.000Z');
	} else {
		dateStr = url.searchParams.get('date') || localDateStr();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw error(400, 'Invalid date');
		start = new Date(dateStr + 'T00:00:00.000Z');
		end = new Date(dateStr + 'T23:59:59.999Z');
	}

	const [entries, goal, weightsInRange, latestWeight] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: isRange ? { $gte: start, $lt: end } : { $gte: start, $lte: end },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null }, date: { $gte: start, $lt: end } },
			{ weight: 1, _id: 0 }
		).lean() as unknown as any[],
		BodyMeasurement.findOne(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ weight: 1, _id: 0 }
		).sort({ date: -1 }).lean() as any,
	]);

	// Custom meals are logged as a single aggregate, which would leave the biggest
	// contributor on many days as an opaque "Chili". Expanding them here means the
	// list names the ingredient that actually carried the nutrient.
	const mealIds: string[] = [...new Set<string>(
		entries
			.filter((e: any) => e.source === 'custom' && e.sourceId)
			.map((e: any) => String(e.sourceId))
	)];
	const meals = mealIds.length
		? await CustomMeal.find({ _id: { $in: mealIds }, createdBy: user.nickname }).lean() as any[]
		: [];

	const contributions = nutrientContributions(expandCustomMeals(entries, meals), key, sortBy);

	// Averaged over logged days only, matching the stats page — days with nothing
	// logged are not evidence that little of the nutrient was eaten.
	const loggedDates = new Set<string>();
	for (const e of entries) loggedDates.add(new Date(e.date).toISOString().slice(0, 10));
	const daysTracked = loggedDates.size;
	const divisor = isRange && daysTracked > 0 ? daysTracked : 1;

	// `entries` stays a raw count of log entries across the window — averaging it
	// would turn "eaten on 5 of 7 days" into a meaningless fraction.
	if (divisor > 1) {
		for (const r of contributions.rows) {
			r.amount /= divisor;
			r.grams /= divisor;
		}
		contributions.total /= divisor;
		for (const u of contributions.unreported) u.grams /= divisor;
	}

	const sex = goal?.sex === 'female' ? 'female' : 'male';
	const dri = getDRI(sex, goal?.dailyCalories ?? null);

	// Amino acid requirements are per kg, so they need the body weight over the same
	// window, falling back to the latest measurement and then a generic adult.
	const rangeWeights = weightsInRange
		.map(m => m?.weight)
		.filter((v): v is number => typeof v === 'number' && v > 0);
	const weight = rangeWeights.length > 0
		? rangeWeights.reduce((a, b) => a + b, 0) / rangeWeights.length
		: (typeof latestWeight?.weight === 'number' ? latestWeight.weight : AMINO_DRI_REFERENCE_WEIGHT);

	const aminoGoal = aminoDri(key, weight);
	const goalValue = aminoGoal > 0 ? aminoGoal : (dri as Record<string, number>)[key] ?? 0;

	return {
		key,
		meta,
		sortBy,
		isRange,
		days: isRange ? days : null,
		date: dateStr,
		daysTracked,
		contributions,
		goal: goalValue,
		// Sodium, sugars, saturated and trans fat are ceilings rather than targets,
		// so the page must not congratulate a food for supplying most of one.
		isMax: !!NUTRIENT_META[key as keyof typeof NUTRIENT_META]?.isMax,
	};
};
