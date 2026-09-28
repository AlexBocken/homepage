/**
 * Custom-meal arithmetic: a meal is a list of ingredients (grams + per-100 g
 * nutrition), logged as one food whose per-100 g figures blend its ingredients.
 *
 * Deliberately plain sums of the stored `calories`: not `entriesCalories`, whose
 * Atwater fallback for foods without a calorie figure would change the numbers
 * the diary has always shown for a meal.
 */
import { SPARSELY_MEASURED_KEYS } from './nutritionMath';
import { TRACE_MINERAL_KEYS } from './traceMinerals';

export interface MealIngredient {
	name: string;
	source?: string;
	sourceId?: string;
	amountGrams: number;
	/** Keyed by nutrient; typed loosely so both the model's NutritionPer100g and a
	 *  plain record fit. */
	per100g?: object;
}

export interface MealLike {
	ingredients: MealIngredient[];
}

/** An ingredient's per-100 g value for `key`, if it has one. */
function valueOf(ing: MealIngredient, key: string): number | undefined {
	return (ing.per100g as Record<string, number | undefined> | undefined)?.[key];
}

/** Every key a logged meal carries, summed over the meal's whole weight. */
export const MEAL_NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
	'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
	'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
	'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
	'pantothenicAcid', 'retinol',
	// Summed like a macro rather than like a trace mineral: an ingredient without
	// the key contains none, so a plain zero is the truth here.
	'alcohol',
	'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine', 'threonine',
	'tryptophan', 'valine', 'histidine', 'alanine', 'arginine', 'asparticAcid',
	'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'] as const;

// Keys a meal must blend over the ingredients that reported them rather than over
// its whole weight, or an unmeasured ingredient dilutes the ones that were.
const MEASURED_WHERE_PRESENT: readonly string[] = [...TRACE_MINERAL_KEYS, ...SPARSELY_MEASURED_KEYS];

/** Names that read as a drink (German and English), for beverages and liquid ingredients. */
export const DRINK_PATTERNS = /^(milch|kaffee|coffee|tee|tea|cola|fanta|sprite|saft|juice|limo|smoothie|kakao|cocoa|bier|beer|wein|wine|eistee|ice tea|energy|redbull|red bull|mate|schorle|sprudel|mineral|orangensaft|apfelsaft|multivitamin|iso|gatorade|powerade)/i;

/** Is a custom meal ingredient a liquid (for hydration auto-logging)? */
export function isLiquidIngredient(ing: Pick<MealIngredient, 'name' | 'source' | 'sourceId'>): boolean {
	if (ing.source === 'bls' && ing.sourceId?.startsWith('N')) return true;
	return DRINK_PATTERNS.test(ing.name) || /^(wasser|water|trinkwasser)/i.test(ing.name);
}

/** The meal's weight: its ingredients' grams summed. */
export function mealTotalGrams(meal: MealLike): number {
	return meal.ingredients.reduce((sum, ing) => sum + ing.amountGrams, 0);
}

/** The meal's kcal from its ingredients' stored calorie figures (no fallback). */
export function mealTotalCal(meal: MealLike): number {
	return meal.ingredients.reduce((sum, ing) => sum + (valueOf(ing, 'calories') ?? 0) * ing.amountGrams / 100, 0);
}

/**
 * The meal as one food: per-100 g figures blended over its ingredients, its total
 * weight, and how many of those grams are liquid.
 */
export function aggregateMealPer100g(meal: MealLike): {
	per100g: Record<string, number>;
	totalGrams: number;
	liquidMl: number;
} {
	const totals: Record<string, number> = {};
	for (const k of MEAL_NUTRIENT_KEYS) totals[k] = 0;
	/** Grams of ingredient each trace mineral was actually measured across. */
	const traceGrams: Record<string, number> = {};
	let totalGrams = 0;
	for (const ing of meal.ingredients) {
		const r = ing.amountGrams / 100;
		totalGrams += ing.amountGrams;
		for (const k of MEAL_NUTRIENT_KEYS) totals[k] += (valueOf(ing, k) ?? 0) * r;
		// Trace minerals only from the ingredients that report them, so a meal built
		// from one BLS and one USDA food keeps both sources' figures instead of
		// diluting each with a fabricated zero for the other.
		for (const k of MEASURED_WHERE_PRESENT) {
			const v = valueOf(ing, k);
			if (typeof v === 'number') {
				totals[k] = (totals[k] ?? 0) + v * r;
				traceGrams[k] = (traceGrams[k] ?? 0) + ing.amountGrams;
			}
		}
	}
	const per100g: Record<string, number> = {};
	const scale = totalGrams > 0 ? 100 / totalGrams : 0;
	for (const k of MEAL_NUTRIENT_KEYS) per100g[k] = totals[k] * scale;
	// Scaled by the grams they were measured across, not the meal weight: the
	// concentration of what was measured is the honest per-100 g figure, and it is
	// written only when something reported it.
	for (const k of MEASURED_WHERE_PRESENT) {
		const g = traceGrams[k] ?? 0;
		if (g > 0) per100g[k] = (totals[k] ?? 0) * (100 / g);
	}
	const liquidMl = meal.ingredients
		.filter(isLiquidIngredient)
		.reduce((sum, ing) => sum + ing.amountGrams, 0);
	return { per100g, totalGrams, liquidMl };
}

/** Macros for `grams` of the meal, for the preview before logging it. */
export function mealPreview(meal: MealLike, grams: number) {
	const { per100g, totalGrams } = aggregateMealPer100g(meal);
	const s = grams / 100;
	return {
		calories: Math.round(per100g.calories * s),
		protein: per100g.protein * s,
		fat: per100g.fat * s,
		carbs: per100g.carbs * s,
		fiber: per100g.fiber * s,
		sugars: per100g.sugars * s,
		saturatedFat: per100g.saturatedFat * s,
		grams,
		totalGrams
	};
}

/** Macro totals of an ingredient list (the meal editor's running sum). */
export function ingredientsTotalNutrition(ings: MealIngredient[]) {
	let calories = 0, protein = 0, fat = 0, carbs = 0;
	let saturatedFat = 0, sugars = 0, fiber = 0;
	for (const ing of ings) {
		const f = ing.amountGrams / 100;
		calories += (valueOf(ing, 'calories') ?? 0) * f;
		protein += (valueOf(ing, 'protein') ?? 0) * f;
		fat += (valueOf(ing, 'fat') ?? 0) * f;
		carbs += (valueOf(ing, 'carbs') ?? 0) * f;
		saturatedFat += (valueOf(ing, 'saturatedFat') ?? 0) * f;
		sugars += (valueOf(ing, 'sugars') ?? 0) * f;
		fiber += (valueOf(ing, 'fiber') ?? 0) * f;
	}
	return { calories, protein, fat, carbs, saturatedFat, sugars, fiber };
}
