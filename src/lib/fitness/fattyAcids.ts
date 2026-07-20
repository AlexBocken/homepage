/**
 * Fatty acid breakdown: which fields exist, how the groups are derived, and what
 * counts as a reference intake.
 *
 * Individual acids are stored as measured and summed here on read, never rolled up
 * at write time. That way a later importer that maps one more acid improves every
 * record already in the database, and a stored total can never silently disagree
 * with the acids it is supposed to be the sum of.
 *
 * The exception is Open Food Facts, which publishes `omega-3-fat` / `omega-6-fat`
 * as totals and almost never a breakdown. Those land in `omega3` / `omega6` and are
 * used only when no individual acid is present.
 *
 * The sums are exact for BLS, which reports every acid in both families for all
 * 7,140 of its foods. They are approximate for USDA, which has no n-6-specific
 * 20:3 figure at all and reports the other minor acids for well under half the
 * foods that carry the main ones — those keys are simply absent and drop out of
 * the sum rather than counting as zero.
 */

import type { NutritionPer100g } from '$types/types';

type Per100g = Partial<Record<string, number | undefined | null>> | null | undefined;

/** Acids that make up each polyunsaturated family, in the order they are charted. */
export const OMEGA3_KEYS = ['alphaLinolenicAcid', 'stearidonicAcid', 'epa', 'dpa', 'dha'] as const;
export const OMEGA6_KEYS = [
	'linoleicAcid', 'gammaLinolenicAcid', 'eicosadienoicAcid',
	'dihomoGammaLinolenicAcid', 'arachidonicAcid',
] as const;

/** Every individual acid we persist. */
export const ACID_KEYS = [...OMEGA6_KEYS, ...OMEGA3_KEYS] as const;

/** Group totals a source may publish directly. */
export const FAT_GROUP_KEYS = [
	'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'transFat',
] as const;

/** Everything a `per100g` may carry for fats, for presence checks and projections. */
export const FATTY_ACID_KEYS = [
	...FAT_GROUP_KEYS, ...ACID_KEYS, 'omega3', 'omega6',
] as const;

export type FattyAcidKey = (typeof FATTY_ACID_KEYS)[number];

/** Display metadata. Reference values live in $lib/data/dailyReferenceIntake. */
export const FATTY_ACID_META: Record<string, { label: string; labelDe: string; short?: string }> = {
	saturatedFat:       { label: 'Saturated',        labelDe: 'Gesättigt',        short: 'SFA' },
	monounsaturatedFat: { label: 'Monounsaturated',  labelDe: 'Einfach ungesättigt', short: 'MUFA' },
	polyunsaturatedFat: { label: 'Polyunsaturated',  labelDe: 'Mehrfach ungesättigt', short: 'PUFA' },
	transFat:           { label: 'Trans',            labelDe: 'Trans',            short: 'TFA' },
	omega3:             { label: 'Omega-3',          labelDe: 'Omega-3' },
	omega6:             { label: 'Omega-6',          labelDe: 'Omega-6' },
	linoleicAcid:       { label: 'Linoleic acid',    labelDe: 'Linolsäure',       short: 'LA (18:2 n-6)' },
	gammaLinolenicAcid: { label: 'γ-Linolenic acid', labelDe: 'γ-Linolensäure',   short: 'GLA (18:3 n-6)' },
	arachidonicAcid:    { label: 'Arachidonic acid', labelDe: 'Arachidonsäure',   short: 'ARA (20:4 n-6)' },
	alphaLinolenicAcid: { label: 'α-Linolenic acid', labelDe: 'α-Linolensäure',   short: 'ALA (18:3 n-3)' },
	stearidonicAcid:    { label: 'Stearidonic acid', labelDe: 'Stearidonsäure',   short: 'SDA (18:4 n-3)' },
	eicosadienoicAcid:  { label: 'Eicosadienoic acid', labelDe: 'Eicosadiensäure', short: '20:2 n-6' },
	dihomoGammaLinolenicAcid: { label: 'Dihomo-γ-linolenic acid', labelDe: 'Dihomo-γ-Linolensäure', short: 'DGLA (20:3 n-6)' },
	epa:                { label: 'EPA',              labelDe: 'EPA',              short: '20:5 n-3' },
	dpa:                { label: 'DPA',              labelDe: 'DPA',              short: '22:5 n-3' },
	dha:                { label: 'DHA',              labelDe: 'DHA',              short: '22:6 n-3' },
	epaDha:             { label: 'EPA + DHA',        labelDe: 'EPA + DHA' },
};

function num(per100g: Per100g, key: string): number | null {
	const v = per100g?.[key];
	return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

/**
 * Sum of the acids present, or null when none is. Absent acids are treated as
 * unknown rather than zero, so a food reporting only DHA yields DHA and not a
 * total that pretends the other three were measured at zero.
 */
function sumPresent(per100g: Per100g, keys: readonly string[]): number | null {
	let total = 0;
	let any = false;
	for (const k of keys) {
		const v = num(per100g, k);
		if (v !== null) { total += v; any = true; }
	}
	return any ? total : null;
}

export type DerivedValue = {
	value: number;
	/** True when summed from individual acids, false when taken from a stored total. */
	derived: boolean;
	/** Individual acids that contributed, for "n of 4 acids reported" disclosure. */
	from: string[];
};

/**
 * Omega-3 and omega-6 totals. Prefers the sum of individual acids; falls back to a
 * source-published total (OFF) only when no individual acid is available.
 */
export function omegaTotals(per100g: Per100g): { omega3: DerivedValue | null; omega6: DerivedValue | null } {
	function resolve(keys: readonly string[], storedKey: string): DerivedValue | null {
		const present = keys.filter(k => num(per100g, k) !== null);
		if (present.length > 0) {
			return { value: sumPresent(per100g, keys) ?? 0, derived: true, from: present };
		}
		const stored = num(per100g, storedKey);
		return stored === null ? null : { value: stored, derived: false, from: [] };
	}
	return {
		omega3: resolve(OMEGA3_KEYS, 'omega3'),
		omega6: resolve(OMEGA6_KEYS, 'omega6'),
	};
}

/** EPA + DHA, the pair the marine-omega-3 reference intake is expressed against. */
export function epaDha(per100g: Per100g): DerivedValue | null {
	const present = ['epa', 'dha'].filter(k => num(per100g, k) !== null);
	if (present.length === 0) return null;
	return { value: sumPresent(per100g, ['epa', 'dha']) ?? 0, derived: true, from: present };
}

/**
 * The fat composition for a stacked bar: the measured groups plus whatever total
 * fat they do not account for.
 *
 * `unaccounted` is not a fatty acid. Total fat is measured gravimetrically — the
 * whole lipid extract, including the glycerol backbones, phospholipids and sterols
 * — while the group columns count only the acids themselves. The two therefore
 * never match: glycerol alone is ~4-5% of a triglyceride, so even a pure oil leaves
 * a few percent over, and lean tissue leaves far more because membrane phospholipid
 * makes up much of its lipid. Across BLS the acids cover a median 88% of total fat,
 * but under 50% for something like a cooked chicken breast.
 *
 * Label it as lipids rather than "other fat", or a lean food reads as though most
 * of its fat were an unidentified fatty acid. Never negative.
 */
export type FatSplit = {
	fat: number;
	saturated: number | null;
	mono: number | null;
	poly: number | null;
	trans: number | null;
	unaccounted: number;
	/** False when no subtype at all was reported, so the bar should not be drawn. */
	hasBreakdown: boolean;
};

export function fatSplit(per100g: Per100g): FatSplit {
	const fat = num(per100g, 'fat') ?? 0;
	const saturated = num(per100g, 'saturatedFat');
	const mono = num(per100g, 'monounsaturatedFat');
	const poly = num(per100g, 'polyunsaturatedFat');
	const trans = num(per100g, 'transFat');
	const known = (saturated ?? 0) + (mono ?? 0) + (poly ?? 0) + (trans ?? 0);
	return {
		fat,
		saturated, mono, poly, trans,
		unaccounted: Math.max(0, fat - known),
		hasBreakdown: [saturated, mono, poly, trans].some(v => v !== null),
	};
}

/**
 * Carbohydrate composition for the companion stacked bar. `other` is starch and
 * polyols — whatever total carbohydrate is left after sugars and fibre.
 *
 * Whether fibre is already inside `carbs` differs by source: BLS and USDA report
 * carbohydrate excluding fibre, OFF follows the EU label which also excludes it.
 * Both agree, so fibre is charted alongside sugars rather than subtracted twice.
 */
export type CarbSplit = {
	carbs: number;
	sugars: number | null;
	fiber: number | null;
	other: number;
	hasBreakdown: boolean;
};

export function carbSplit(per100g: Per100g): CarbSplit {
	const carbs = num(per100g, 'carbs') ?? 0;
	const sugars = num(per100g, 'sugars');
	const fiber = num(per100g, 'fiber');
	return {
		carbs,
		sugars, fiber,
		other: Math.max(0, carbs - (sugars ?? 0)),
		hasBreakdown: sugars !== null || fiber !== null,
	};
}

/** True when a record carries any fat breakdown beyond total fat. */
export function hasFattyAcids(per100g: Per100g): boolean {
	return FATTY_ACID_KEYS.some(k => num(per100g, k) !== null);
}

/**
 * Scale a per-100 g record to an eaten amount, keeping absent keys absent so the
 * presence rules above survive aggregation.
 */
export function scaleFattyAcids(per100g: Per100g, grams: number): Record<string, number> {
	const out: Record<string, number> = {};
	for (const k of [...FATTY_ACID_KEYS, 'fat', 'carbs', 'sugars', 'fiber'] as string[]) {
		const v = num(per100g, k);
		if (v !== null) out[k] = (v * grams) / 100;
	}
	return out;
}

/**
 * Total a day (or range) of entries. A key is summed only across the entries that
 * report it, and `reportedGrams` records how much food that was — the caller needs
 * it to say "based on 68% of the day" rather than implying full coverage.
 */
export function sumFattyAcids(
	entries: { amountGrams?: number; per100g?: Per100g }[] | null | undefined,
): { totals: Record<string, number>; reportedGrams: Record<string, number>; totalGrams: number } {
	const totals: Record<string, number> = {};
	const reportedGrams: Record<string, number> = {};
	let totalGrams = 0;

	for (const e of entries ?? []) {
		const grams = e.amountGrams ?? 0;
		if (grams <= 0) continue;
		totalGrams += grams;
		const scaled = scaleFattyAcids(e.per100g, grams);
		for (const [k, v] of Object.entries(scaled)) {
			totals[k] = (totals[k] ?? 0) + v;
			reportedGrams[k] = (reportedGrams[k] ?? 0) + grams;
		}
	}
	return { totals, reportedGrams, totalGrams };
}

export type { NutritionPer100g };
