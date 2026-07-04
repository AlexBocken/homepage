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

/** Scale a single per-100g nutrient value to a gram amount. */
export function scaleFromPer100g(valuePer100g: number | undefined | null, grams: number): number {
	return ((valuePer100g ?? 0) * grams) / 100;
}

/** Total calories over food-log-style entries, from their per100g.calories. */
export function entriesCalories(
	entries: Array<{ per100g?: { calories?: number } | null; amountGrams: number }>
): number {
	return entries.reduce((sum, e) => sum + scaleFromPer100g(e.per100g?.calories, e.amountGrams), 0);
}
