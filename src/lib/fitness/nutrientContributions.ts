/**
 * Which foods supplied a given nutrient over a window.
 *
 * Kept free of database and Svelte concerns so the weighting rules can be tested
 * directly — they are the part that is easy to get subtly wrong.
 *
 * Two orderings matter and they answer different questions. "Amount" ranks by how
 * much of the nutrient a food actually delivered, which is what moved the day's
 * total. "Per 100 g" ranks by concentration, which is what you would want when
 * deciding what to eat more of — a sprinkle of dried parsley beats a bowl of
 * spinach per gram while contributing almost nothing to the day.
 */

import { NUTRIENT_META } from '$lib/data/dailyReferenceIntake';
import { FATTY_ACID_META, omegaTotals, epaDha } from '$lib/fitness/fattyAcids';

type Per100g = Record<string, number | null | undefined> | null | undefined;

export type ContributionEntry = {
	name?: string;
	source?: string;
	sourceId?: string;
	amountGrams?: number;
	mealType?: string;
	date?: Date | string;
	per100g?: Per100g;
	/** Set when this row is an ingredient of a custom meal, naming that meal. */
	via?: string;
};

/**
 * Amino acid names. Duplicated in three page components already; this copy exists
 * so the contributions route does not add a fourth inline in a route file. Folding
 * the others into it is worth doing but is not this change.
 */
export const AMINO_META: Record<string, { label: string; labelDe: string }> = {
	leucine:       { label: 'Leucine',       labelDe: 'Leucin' },
	isoleucine:    { label: 'Isoleucine',    labelDe: 'Isoleucin' },
	valine:        { label: 'Valine',        labelDe: 'Valin' },
	lysine:        { label: 'Lysine',        labelDe: 'Lysin' },
	methionine:    { label: 'Methionine',    labelDe: 'Methionin' },
	phenylalanine: { label: 'Phenylalanine', labelDe: 'Phenylalanin' },
	threonine:     { label: 'Threonine',     labelDe: 'Threonin' },
	tryptophan:    { label: 'Tryptophan',    labelDe: 'Tryptophan' },
	histidine:     { label: 'Histidine',     labelDe: 'Histidin' },
	alanine:       { label: 'Alanine',       labelDe: 'Alanin' },
	arginine:      { label: 'Arginine',      labelDe: 'Arginin' },
	asparticAcid:  { label: 'Aspartic Acid (Asx)', labelDe: 'Asparaginsäure (Asx)' },
	cysteine:      { label: 'Cysteine',      labelDe: 'Cystein' },
	glutamicAcid:  { label: 'Glutamic Acid (Glx)', labelDe: 'Glutaminsäure (Glx)' },
	glycine:       { label: 'Glycine',       labelDe: 'Glycin' },
	proline:       { label: 'Proline',       labelDe: 'Prolin' },
	serine:        { label: 'Serine',        labelDe: 'Serin' },
	tyrosine:      { label: 'Tyrosine',      labelDe: 'Tyrosin' },
};

/** Keys that are summed from other keys rather than stored. */
const DERIVED = new Set(['omega3', 'omega6', 'epaDha']);

export type NutrientMeta = { label: string; labelDe: string; unit: string; derived: boolean };

/**
 * Label and unit for any nutrient the diary can show, or null if the key is unknown.
 *
 * Lookups go through Object.hasOwn because the key arrives from the URL: a plain
 * object literal inherits from Object.prototype, so a bare `META[key]` answers
 * truthily for '__proto__', 'constructor' and 'toString', and the route would serve
 * a page of nonsense instead of a 404.
 */
export function nutrientMeta(key: string): NutrientMeta | null {
	if (Object.hasOwn(NUTRIENT_META, key)) {
		const dri = NUTRIENT_META[key as keyof typeof NUTRIENT_META];
		return { label: dri.label, labelDe: dri.labelDe, unit: dri.unit, derived: DERIVED.has(key) };
	}
	if (Object.hasOwn(AMINO_META, key)) {
		const amino = AMINO_META[key];
		return { label: amino.label, labelDe: amino.labelDe, unit: 'g', derived: false };
	}
	if (Object.hasOwn(FATTY_ACID_META, key)) {
		const fat = FATTY_ACID_META[key];
		return { label: fat.label, labelDe: fat.labelDe, unit: 'g', derived: DERIVED.has(key) };
	}
	return null;
}

/** Whether a key is something this page knows how to break down. */
export function isKnownNutrient(key: string): boolean {
	return nutrientMeta(key) !== null;
}

/**
 * A food's per-100 g figure for a nutrient, or null when it did not report one.
 *
 * Derived keys are resolved per record rather than from a stored total, matching
 * how the diary and the stats page total them — an Open Food Facts record with only
 * an omega-3 total and a USDA record with four individual acids must both count.
 */
export function per100gValue(per100g: Per100g, key: string): number | null {
	if (key === 'omega3' || key === 'omega6') {
		const totals = omegaTotals(per100g);
		return totals[key]?.value ?? null;
	}
	if (key === 'epaDha') return epaDha(per100g)?.value ?? null;

	const v = per100g?.[key];
	return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

export type ContributionRow = {
	name: string;
	source: string;
	sourceId: string;
	/** The custom meal this ingredient came from, if any. */
	via?: string;
	/** Total grams of this food eaten in the window. */
	grams: number;
	/** Total of the nutrient this food supplied, in the nutrient's unit. */
	amount: number;
	/** The food's concentration, unchanged by how much was eaten. */
	per100g: number;
	/** How many separate log entries were folded into this row. */
	entries: number;
	/** Share of the window's total for this nutrient, 0-1. */
	share: number;
};

type MealLike = {
	_id?: unknown;
	name?: string;
	ingredients?: { name?: string; source?: string; sourceId?: string; amountGrams?: number; per100g?: Per100g }[];
};

/**
 * Replace logged custom meals with their ingredients.
 *
 * A custom meal is logged as one entry carrying an aggregate per100g, which makes it
 * a dead end here — "Chili 400 g" says nothing about which part of it held the iron.
 * Each ingredient is scaled by the share of the meal actually eaten: logging half the
 * chili means half of every ingredient.
 *
 * Only one level is expanded. An ingredient that is itself a custom meal keeps its
 * own aggregate, which is still an improvement on the enclosing meal's.
 *
 * Meals that cannot be expanded — deleted since logging, or with no recorded weight —
 * are passed through untouched rather than dropped, so the totals stay complete.
 */
export function expandCustomMeals(
	entries: ContributionEntry[] | null | undefined,
	meals: MealLike[] | null | undefined,
): ContributionEntry[] {
	const byId = new Map<string, MealLike>();
	for (const m of meals ?? []) {
		if (m?._id != null) byId.set(String(m._id), m);
	}

	const out: ContributionEntry[] = [];
	for (const e of entries ?? []) {
		const meal = e.source === 'custom' && e.sourceId ? byId.get(e.sourceId) : undefined;
		const ingredients = meal?.ingredients ?? [];
		const mealGrams = ingredients.reduce((s, i) => s + (i.amountGrams ?? 0), 0);

		if (!meal || ingredients.length === 0 || mealGrams <= 0) {
			out.push(e);
			continue;
		}

		const eaten = e.amountGrams ?? 0;
		const portion = eaten / mealGrams;
		for (const ing of ingredients) {
			const grams = (ing.amountGrams ?? 0) * portion;
			if (grams <= 0) continue;
			out.push({
				name: ing.name ?? '',
				source: ing.source ?? '',
				sourceId: ing.sourceId ?? '',
				amountGrams: grams,
				mealType: e.mealType,
				date: e.date,
				per100g: ing.per100g,
				via: meal.name ?? e.name ?? '',
			});
		}
	}
	return out;
}

export type Contributions = {
	rows: ContributionRow[];
	/** Total supplied by every food that reported the nutrient. */
	total: number;
	/** Foods that reported no figure — their contribution is unknown, not zero. */
	unreported: { name: string; grams: number }[];
	/** Grams of food whose source published a figure, over grams eaten. */
	coverage: number;
};

/**
 * Aggregate entries into per-food contributions.
 *
 * Entries for the same food are folded together, so a coffee logged at breakfast
 * and again after lunch reads as one row of two entries rather than two rows that
 * each look minor. Concentration is taken from the food itself, not recomputed from
 * the totals, so it stays stable regardless of how much was eaten.
 *
 * The same ingredient reached through different custom meals stays on separate rows,
 * because `via` is part of the identity. Folding them would produce a row that names
 * one meal while counting another's grams.
 *
 * Foods whose source never published this nutrient are separated out rather than
 * counted as zero: the diary treats an absent key as unknown, and quietly ranking
 * such a food last would assert it contains none.
 */
export function nutrientContributions(
	entries: ContributionEntry[] | null | undefined,
	key: string,
	sortBy: 'amount' | 'per100g' = 'amount',
): Contributions {
	const byFood = new Map<string, ContributionRow>();
	const unreported = new Map<string, { name: string; grams: number }>();
	let total = 0;
	let gramsAll = 0;
	let gramsReported = 0;

	for (const e of entries ?? []) {
		const grams = e.amountGrams ?? 0;
		if (grams <= 0) continue;
		const name = e.name ?? '';
		gramsAll += grams;

		const conc = per100gValue(e.per100g, key);
		if (conc === null) {
			const k = `${e.source ?? ''}:${e.sourceId ?? name}:${e.via ?? ''}`;
			const prev = unreported.get(k);
			if (prev) prev.grams += grams;
			else unreported.set(k, { name, grams });
			continue;
		}

		gramsReported += grams;
		const amount = (conc * grams) / 100;
		total += amount;

		const k = `${e.source ?? ''}:${e.sourceId ?? name}:${e.via ?? ''}`;
		const prev = byFood.get(k);
		if (prev) {
			prev.grams += grams;
			prev.amount += amount;
			prev.entries += 1;
			// Weighted by grams so folding two servings of the same food that were
			// logged from different sources cannot drift the concentration.
			prev.per100g = prev.grams > 0 ? (prev.amount / prev.grams) * 100 : conc;
		} else {
			byFood.set(k, {
				name,
				source: e.source ?? '',
				sourceId: e.sourceId ?? '',
				via: e.via,
				grams,
				amount,
				per100g: conc,
				entries: 1,
				share: 0,
			});
		}
	}

	const rows = [...byFood.values()];
	for (const r of rows) r.share = total > 0 ? r.amount / total : 0;

	rows.sort((a, b) =>
		sortBy === 'per100g'
			? b.per100g - a.per100g || b.amount - a.amount
			: b.amount - a.amount || b.per100g - a.per100g
	);

	return {
		rows,
		total,
		unreported: [...unreported.values()].sort((a, b) => b.grams - a.grams),
		coverage: gramsAll > 0 ? gramsReported / gramsAll : 1,
	};
}
