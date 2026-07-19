import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { microCoverage } from '$lib/fitness/microCoverage';

const MICRO_KEYS = [
	'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
	'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin',
	'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
];

const AMINO_KEYS = [
	'leucine', 'isoleucine', 'valine', 'lysine', 'methionine', 'phenylalanine', 'threonine',
	'tryptophan', 'histidine', 'alanine', 'arginine', 'asparticAcid', 'cysteine',
	'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine',
];

/**
 * Average daily micronutrient and amino acid intake over the last 7 or 30 completed
 * days. Averaged over *logged* days only (same rule as the macro split on the stats
 * page) — days without any food logged would otherwise drag every value to zero.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const days = url.searchParams.get('days') === '30' ? 30 : 7;

	// Day keys are stored as UTC-midnight of the *local* calendar day, so the range
	// is derived from the local date. Today is excluded — it is still incomplete.
	const todayStart = new Date(localDateStr() + 'T00:00:00.000Z');
	const rangeStart = new Date(localDateOffset(-days) + 'T00:00:00.000Z');

	const [entries, goal, weightsInRange, latestWeight] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: rangeStart, $lt: todayStart },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null }, date: { $gte: rangeStart, $lt: todayStart } },
			{ weight: 1, _id: 0 }
		).lean() as unknown as any[],
		BodyMeasurement.findOne(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ weight: 1, _id: 0 }
		).sort({ date: -1 }).lean() as any,
	]);

	// The amino acid requirements are per kg, and these figures are an average over the
	// window — so the weight they scale by is averaged over the same window. If nothing
	// was measured in it, the most recent measurement stands in.
	// BodyMeasurement.weight is a plain number (kg), not a { value, unit } object.
	const rangeWeights = weightsInRange
		.map(m => m?.weight)
		.filter((v): v is number => typeof v === 'number' && v > 0);
	const weight = rangeWeights.length > 0
		? rangeWeights.reduce((a, b) => a + b, 0) / rangeWeights.length
		: (typeof latestWeight?.weight === 'number' ? latestWeight.weight : null);

	const micros: Record<string, number> = {};
	const aminos: Record<string, number> = {};
	for (const k of MICRO_KEYS) micros[k] = 0;
	for (const k of AMINO_KEYS) aminos[k] = 0;

	const loggedDates = new Set<string>();
	for (const e of entries) {
		const mult = (e.amountGrams ?? 0) / 100;
		if (mult <= 0) continue;
		const p = e.per100g ?? {};
		loggedDates.add(new Date(e.date).toISOString().slice(0, 10));
		for (const k of MICRO_KEYS) micros[k] += (p[k] ?? 0) * mult;
		for (const k of AMINO_KEYS) aminos[k] += (p[k] ?? 0) * mult;
	}

	const daysTracked = loggedDates.size;
	if (daysTracked > 0) {
		for (const k of MICRO_KEYS) micros[k] /= daysTracked;
		for (const k of AMINO_KEYS) aminos[k] /= daysTracked;
	}

	return json({
		days,
		daysTracked,
		// Open Food Facts products carry no micronutrient data, so a diary built from
		// them understates every value here. Report how much of the window is covered.
		coverage: microCoverage(entries),
		micros,
		aminos,
		sex: goal?.sex === 'female' ? 'female' : 'male',
		weight,
		weightIsAverage: rangeWeights.length > 0,
	});
};
