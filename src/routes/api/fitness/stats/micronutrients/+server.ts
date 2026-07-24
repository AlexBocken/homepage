import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { microCoverage } from '$lib/fitness/microCoverage';
import { TRACE_MINERAL_KEYS, traceTotals } from '$lib/fitness/traceMinerals';
import { resolveEntries } from '$lib/server/foodLogComponents';
import {
	FAT_GROUP_KEYS, ACID_KEYS, omegaTotals, epaDha as epaDhaOf, fatSplit, carbSplit,
} from '$lib/fitness/fattyAcids';

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

	// Fatty acids are summed only over the entries that report them, so a key absent
	// from a record leaves the average alone instead of pulling it toward zero. That
	// makes the totals honest but partial, which is why the fat they were measured
	// across is tracked alongside them.
	const fats: Record<string, number> = {};
	// Fat and carbohydrate composition for the hero bars. `unknown` is the mass from
	// entries that published no breakdown at all — kept separate from `other` (the
	// measured remainder) so the bar can distinguish "not sugar or fibre" from
	// "nobody said".
	const composition = {
		fat: 0, saturated: 0, mono: 0, poly: 0, trans: 0, fatOther: 0, fatUnknown: 0,
		carbs: 0, sugars: 0, fiber: 0, carbOther: 0, carbUnknown: 0,
	};

	// Stored entries are references; resolve them, then aggregate over the flattened
	// leaves rather than the entries. A decomposed meal must count as its base-table
	// ingredients so trace/amino sparsity and coverage stay honest per source.
	const resolved = await resolveEntries(entries as any[]);
	const flat = resolved.flatMap(e => e.components);
	const loggedDates = new Set<string>(
		resolved.map(e => new Date(e.date).toISOString().slice(0, 10)),
	);
	for (const c of flat) {
		const mult = (c.amountGrams ?? 0) / 100;
		if (mult <= 0) continue;
		const p = c.per100g ?? {};
		for (const k of MICRO_KEYS) micros[k] += (p[k] ?? 0) * mult;
		for (const k of AMINO_KEYS) aminos[k] += (p[k] ?? 0) * mult;

		for (const k of [...FAT_GROUP_KEYS, ...ACID_KEYS] as string[]) {
			const v = p[k];
			if (typeof v === 'number') fats[k] = (fats[k] ?? 0) + v * mult;
		}
		// Derived per entry, not from the summed acids: an OFF record contributing a
		// stored omega-3 total and a USDA record contributing four acids must both
		// land in the same figure, and only the per-record view knows which is which.
		const { omega3, omega6 } = omegaTotals(p);
		if (omega3) fats.omega3 = (fats.omega3 ?? 0) + omega3.value * mult;
		if (omega6) fats.omega6 = (fats.omega6 ?? 0) + omega6.value * mult;
		const ed = epaDhaOf(p);
		if (ed) fats.epaDha = (fats.epaDha ?? 0) + ed.value * mult;

		const fs = fatSplit(p);
		composition.fat += fs.fat * mult;
		if (fs.hasBreakdown) {
			composition.saturated += (fs.saturated ?? 0) * mult;
			composition.mono += (fs.mono ?? 0) * mult;
			composition.poly += (fs.poly ?? 0) * mult;
			composition.trans += (fs.trans ?? 0) * mult;
			composition.fatOther += fs.unaccounted * mult;
		} else {
			composition.fatUnknown += fs.fat * mult;
		}

		const cs = carbSplit(p);
		composition.carbs += cs.carbs * mult;
		if (cs.hasBreakdown) {
			composition.sugars += (cs.sugars ?? 0) * mult;
			composition.fiber += (cs.fiber ?? 0) * mult;
			composition.carbOther += cs.other * mult;
		} else {
			composition.carbUnknown += cs.carbs * mult;
		}
	}

	// Trace minerals are summed over the leaves that report each one, so they are
	// derived from the flattened components rather than accumulated in the loop above.
	const traces = traceTotals(flat);
	const traceAvg: Record<string, number> = {};

	const daysTracked = loggedDates.size;
	if (daysTracked > 0) {
		for (const k of TRACE_MINERAL_KEYS) {
			const v = traces.totals[k];
			if (typeof v === 'number') traceAvg[k] = v / daysTracked;
		}
		for (const k of MICRO_KEYS) micros[k] /= daysTracked;
		for (const k of AMINO_KEYS) aminos[k] /= daysTracked;
		for (const k of Object.keys(fats)) fats[k] /= daysTracked;
		for (const k of Object.keys(composition)) {
			composition[k as keyof typeof composition] /= daysTracked;
		}
	}

	// What share of the fat logged came with any breakdown. The fatty acid figures
	// are averages across that share only, so the page can say so rather than
	// implying the day was fully characterised.
	const fatCoverage = composition.fat > 0
		? (composition.fat - composition.fatUnknown) / composition.fat
		: 1;

	return json({
		days,
		daysTracked,
		// Open Food Facts products carry no micronutrient data, so a diary built from
		// them understates every value here. Report how much of the window is covered.
		coverage: microCoverage(flat),
		micros,
		// Trace minerals travel with their own per-mineral coverage: BLS has no
		// selenium and USDA no chromium or molybdenum, so how much of the window a
		// figure was measured across varies by mineral, not just by entry.
		traces: traceAvg,
		traceCoverage: traces.coverage,
		aminos,
		fats,
		composition,
		fatCoverage,
		sex: goal?.sex === 'female' ? 'female' : 'male',
		// Lets the page scale the energy-share fatty acid references to what this
		// person actually aims to eat rather than a generic 2000/1600 kcal day.
		dailyCalories: typeof goal?.dailyCalories === 'number' ? goal.dailyCalories : null,
		weight,
		weightIsAverage: rangeWeights.length > 0,
	});
};
