/**
 * Per-100 g nutrition for a whole recipe, summed from its ingredient mappings.
 *
 * Deliberately does NOT import $lib/server/nutritionMatcher: that module pulls
 * in @huggingface/transformers for embedding-based matching, which has no place
 * in a listing request. Only the two lookup tables are needed here, and a
 * mapping already carries the code that identifies its row.
 */
import { NUTRITION_DB, type NutritionEntry } from '$lib/data/nutritionDb';
import { BLS_DB, type BlsEntry } from '$lib/data/blsDb';
import { ingredientGrams } from '$lib/js/ingredientAmount';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';
import type { NutritionPer100g } from '$types/types';

function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}

let blsByCode: Map<string, BlsEntry> | null = null;
let usdaByFdcId: Map<number, NutritionEntry> | null = null;

function getBlsByCode(): Map<string, BlsEntry> {
	if (!blsByCode) blsByCode = new Map(BLS_DB.map((e) => [e.blsCode, e]));
	return blsByCode;
}

function getUsdaByFdcId(): Map<number, NutritionEntry> {
	if (!usdaByFdcId) usdaByFdcId = new Map(NUTRITION_DB.map((e) => [e.fdcId, e]));
	return usdaByFdcId;
}

function resolvePer100g(m: {
	per100g?: NutritionPer100g;
	source?: string;
	blsCode?: string;
	fdcId?: number;
}): NutritionPer100g | undefined {
	if (m.per100g) return m.per100g;
	if (m.source === 'bls' && m.blsCode) return getBlsByCode().get(m.blsCode)?.per100g;
	if (m.fdcId) return getUsdaByFdcId().get(m.fdcId)?.per100g;
	return undefined;
}

export type Per100gResult = { per100g: Record<string, number>; totalGrams: number };

/**
 * What a recipe this one builds on contributes.
 *
 * `totalGrams` is the part every caller used to leave out. A base recipe's
 * nutrients were added to the parent while its weight was not, so a pizza's
 * dough pushed the calories up and the denominator stayed at the toppings —
 * every per-100 g figure for a recipe with a base came out too high.
 */
export type ReferencedTotals = {
	shortName: string;
	name: string;
	/** Where in the recipe it was named. A `type: 'reference'` section stores an
	 *  ObjectId, which only says which recipe it means once it has been looked up,
	 *  so position is the one key both sides can agree on before that happens. */
	sectionIndex: number;
	/** Absent for a whole reference section; set for a linked ingredient line. */
	ingredientIndex?: number;
	/** Absolute nutrient totals of the referenced recipe, at multiplier 1. */
	nutrition: Record<string, number>;
	/** What the referenced recipe weighs, at multiplier 1. */
	totalGrams: number;
	/** The fraction of it this recipe uses. */
	baseMultiplier: number;
	/** Its own ingredient lines that resolved to a food, and lines that could
	 *  have — its bases' lines included. */
	mapped: number;
	mappable: number;
	/** `mapped / mappable`. A base recipe that is half mapped makes the parent's
	 *  figures half a guess, and nothing used to say so. */
	coverage: number;
};

export type RecipeTotals = {
	totals: Record<string, number>;
	totalGrams: number;
	/** Ingredient lines that resolved to a food, and lines that could have. */
	mapped: number;
	mappable: number;
};

/**
 * Sum every numeric key the recipe's own ingredients carry, amino acids
 * included. A fixed list silently drops what it omits, and this result is
 * *cached onto the recipe*, so anything missed stays missing until the cache is
 * rebuilt.
 *
 * Referenced recipes are not summed here — they need a database round trip, so
 * they are resolved by `$lib/server/recipeReferences` and handed to
 * `computePer100g` below.
 */
export function computeTotals(recipe: {
	nutritionMappings?: any[];
	ingredients?: any[];
}): RecipeTotals {
	const ingredients = recipe.ingredients ?? [];

	// An ingredient named after another section is that section, listed again as a
	// component — "Teig" inside "Belag" when there is a "Teig" section above. Its
	// weight is already in the sum, so counting it would double the dough.
	const sectionNames = new Set<string>();
	for (const section of ingredients) {
		if (section?.name) sectionNames.add(stripHtml(section.name).toLowerCase().trim());
	}

	const totals: Record<string, number> = {};
	let totalGrams = 0;
	let mapped = 0;
	let mappable = 0;

	for (const m of recipe.nutritionMappings ?? []) {
		// A reference mapping stands for another recipe, counted separately.
		if (m.recipeRef) continue;

		const section = ingredients[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const ing = items[m.ingredientIndex];

		// Only a link to another *recipe* is a reference, counted whole by
		// resolveReferences. A link to an external page is a citation — "Kletzen,
		// Schweiz: doerrbirnen.ch" is still an ingredient — and skipping the line for
		// having any anchor in it dropped its weight from the recipe silently.
		const rawName = ing?.name ?? '';
		if (parseAnchorRecipeRef(rawName)) continue;
		const itemName = stripHtml(rawName).toLowerCase().trim();
		const ownSection = section?.name ? stripHtml(section.name).toLowerCase().trim() : '';
		if (itemName && sectionNames.has(itemName) && itemName !== ownSection) continue;

		if (m.excluded) continue;
		mappable++;
		if (m.matchMethod === 'none' || !m.gramsPerUnit) continue;

		const per100g = resolvePer100g(m);
		if (!per100g) continue;
		mapped++;

		const grams = ingredientGrams(m, ing?.amount);
		totalGrams += grams;
		const factor = grams / 100;
		for (const [k, v] of Object.entries(per100g as Record<string, unknown>)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + factor * v;
		}
	}

	return { totals, totalGrams, mapped, mappable };
}

/**
 * Per-100 g nutrition for a whole recipe, its base recipes included.
 *
 * Returns null when there is nothing to weigh — an unmapped recipe, or one whose
 * every ingredient was excluded and which builds on nothing.
 */
export function computePer100g(
	recipe: { nutritionMappings?: any[]; ingredients?: any[] },
	references: ReferencedTotals[] = [],
): Per100gResult | null {
	if (!recipe.nutritionMappings?.length && references.length === 0) return null;

	const { totals, totalGrams: ownGrams } = computeTotals(recipe);
	let totalGrams = ownGrams;

	// Nutrients *and* weight, both scaled by how much of the base recipe is used.
	for (const ref of references) {
		const scale = ref.baseMultiplier || 1;
		totalGrams += ref.totalGrams * scale;
		for (const [k, v] of Object.entries(ref.nutrition)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v * scale;
		}
	}

	if (totalGrams <= 0) return null;

	const per100g: Record<string, number> = {};
	for (const [k, v] of Object.entries(totals)) per100g[k] = (v / totalGrams) * 100;
	return { per100g, totalGrams };
}
