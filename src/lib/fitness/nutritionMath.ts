/**
 * Food-log macro/calorie math — the single source of truth shared by the
 * nutrition page, the food-detail page, the meals page, MacroBreakdown, and the
 * nutrition stats endpoint. Previously each surface reimplemented the Atwater
 * factors, the per-100g scaling, and the calorie-split percentages inline, so a
 * tweak in one place silently diverged from the others.
 *
 * Isomorphic: imported by both server endpoints and Svelte components.
 */

/** kcal per gram of each macro (Atwater factors). */
export const MACRO_KCAL = { protein: 4, fat: 9, carbs: 4 } as const;

/**
 * kcal per gram of ethanol (Atwater). Not a macro and not part of MACRO_KCAL: it
 * belongs to no macro goal and is never a target, but it is energy, and leaving it
 * out is what made a beer's calories vanish from a day's total.
 */
export const ALCOHOL_KCAL = 7;

/**
 * The rest of what a food's stated energy is made of. Sugar alcohols are only
 * partly absorbed (EU Regulation 1169/2011 fixes them at 2.4 kcal/g) and organic
 * acids — citric, malic, lactic — are metabolised at about 3. Neither is a macro,
 * neither is alcohol, and together with ethanol they account for nearly all of the
 * gap between a source's own kcal figure and the 4/9/4 sum of its macros.
 *
 * BLS publishes both; USDA and Open Food Facts publish neither, so for a food from
 * those the gap stays in `energySources().other` rather than being attributed.
 */
export const SUGAR_ALCOHOL_KCAL = 2.4;
export const ORGANIC_ACID_KCAL = 3;

/**
 * Nutrients no single source measures throughout, so an absent key means "nobody
 * looked" rather than "none present" — the rule the trace minerals and fatty acids
 * already follow. BLS publishes the sugar alcohols and organic acids and USDA none
 * of them; USDA publishes caffeine and BLS none of it; biotin, starch and the two
 * sugars are well covered in BLS and partly in USDA.
 *
 * Anything summing these across foods must weight by the amount that actually
 * reported them rather than fabricating a zero for the rest.
 */
export const SPARSELY_MEASURED_KEYS = [
	'biotin', 'caffeine', 'starch', 'fructose', 'lactose', 'sugarAlcohols', 'organicAcids',
] as const;

export type MacroGrams = { protein?: number; fat?: number; carbs?: number };

/**
 * Atwater-derived calories from macro grams (4/9/4). Kept consistent with the
 * macro-goal split, which divides a calorie target on the same factors.
 */
export function atwaterCalories(m: MacroGrams): number {
	return (
		(m.protein ?? 0) * MACRO_KCAL.protein +
		(m.fat ?? 0) * MACRO_KCAL.fat +
		(m.carbs ?? 0) * MACRO_KCAL.carbs
	);
}

/**
 * Share of Atwater calories from each macro, as whole percentages. Carbs take
 * the remainder so the three always sum to exactly 100 (or all 0 when empty).
 */
export function macroCaloriePercent(m: MacroGrams): { protein: number; fat: number; carbs: number } {
	const proteinCal = (m.protein ?? 0) * MACRO_KCAL.protein;
	const fatCal = (m.fat ?? 0) * MACRO_KCAL.fat;
	const carbsCal = (m.carbs ?? 0) * MACRO_KCAL.carbs;
	const total = proteinCal + fatCal + carbsCal;
	if (total === 0) return { protein: 0, fat: 0, carbs: 0 };
	const protein = Math.round((proteinCal / total) * 100);
	const fat = Math.round((fatCal / total) * 100);
	return { protein, fat, carbs: 100 - protein - fat };
}

/**
 * Format a gram amount for display: whole numbers at ≥100 g, one decimal below,
 * '0' for null/NaN. The single source of truth previously copy-pasted (with a
 * dead `v >= 10` branch and an inconsistent null guard) into the nutrition,
 * food-detail, and meals pages and MacroBreakdown.
 */
export function formatGrams(v: number | null | undefined): string {
	if (v == null || isNaN(v)) return '0';
	if (v >= 100) return Math.round(v).toString();
	return v.toFixed(1);
}

/** Format a calorie value as a rounded whole number. */
export function formatKcal(v: number): string {
	return Math.round(v).toString();
}

/** Scale a single per-100g nutrient value to a gram amount. */
export function scaleFromPer100g(valuePer100g: number | undefined | null, grams: number): number {
	return ((valuePer100g ?? 0) * grams) / 100;
}

export type NutritionEntry = {
	per100g?: (MacroGrams & { calories?: number }) | null;
	amountGrams: number;
};

/**
 * Energy of one food-log entry.
 *
 * Always prefers the energy the source itself publishes. Protein/fat/carbs do
 * not account for every calorie a food carries — alcohol (7 kcal/g), polyols and
 * organic acids are all invisible to the 4/9/4 sum, so an Atwater total for a
 * beer lands at roughly a third of its real kcal. The stated figure already
 * includes them.
 *
 * Atwater is only the fallback for entries whose source published no energy
 * value at all, so those still contribute something rather than nothing.
 */
export function entryCalories(e: NutritionEntry): number {
	const p = e.per100g;
	if (p && typeof p.calories === 'number' && p.calories > 0) {
		return scaleFromPer100g(p.calories, e.amountGrams);
	}
	return scaleFromPer100g(atwaterCalories(p ?? {}), e.amountGrams);
}

/**
 * Where a day's energy came from, in kcal.
 *
 * Everything with a known factor is computed from its grams — the three macros,
 * ethanol, sugar alcohols and organic acids. `other` is whatever the foods' own
 * kcal figures still carry beyond all of them: the share from a source that
 * published no polyol or acid figure, plus the plain fact that a stated energy
 * value is measured rather than reconstructed. It is shown rather than folded into
 * a macro, because attributing it would be a guess.
 *
 * Clamped at zero: a food whose components over-explain its stated energy would
 * otherwise render a negative slice.
 */
export function energySources(
	totals: MacroGrams & { alcohol?: number; sugarAlcohols?: number; organicAcids?: number },
	statedCalories: number
): {
	protein: number; fat: number; carbs: number;
	alcohol: number; sugarAlcohols: number; organicAcids: number; other: number;
} {
	const protein = (totals.protein ?? 0) * MACRO_KCAL.protein;
	const fat = (totals.fat ?? 0) * MACRO_KCAL.fat;
	const carbs = (totals.carbs ?? 0) * MACRO_KCAL.carbs;
	const alcohol = (totals.alcohol ?? 0) * ALCOHOL_KCAL;
	const sugarAlcohols = (totals.sugarAlcohols ?? 0) * SUGAR_ALCOHOL_KCAL;
	const organicAcids = (totals.organicAcids ?? 0) * ORGANIC_ACID_KCAL;
	const accounted = protein + fat + carbs + alcohol + sugarAlcohols + organicAcids;
	return {
		protein, fat, carbs, alcohol, sugarAlcohols, organicAcids,
		other: Math.max(0, statedCalories - accounted),
	};
}

/** Total energy over food-log-style entries. See {@link entryCalories}. */
export function entriesCalories(entries: NutritionEntry[]): number {
	return entries.reduce((sum, e) => sum + entryCalories(e), 0);
}

/**
 * Protein / fat / carb grams eaten over food-log-style entries.
 *
 * The nutrition page sums these alongside forty other fields in one pass, so it keeps
 * its own loop; this is for callers (the nudge endpoint) that need only the macros.
 */
export function entriesMacroGrams(entries: NutritionEntry[]): { protein: number; fat: number; carbs: number } {
	let protein = 0, fat = 0, carbs = 0;
	for (const e of entries) {
		const r = (e.amountGrams ?? 0) / 100;
		const p = /** per-100 g panel */ (e.per100g ?? {}) as Record<string, number | undefined>;
		protein += (p.protein ?? 0) * r;
		fat += (p.fat ?? 0) * r;
		carbs += (p.carbs ?? 0) * r;
	}
	return { protein, fat, carbs };
}
