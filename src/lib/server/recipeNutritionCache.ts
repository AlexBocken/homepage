/**
 * Keeps `cachedPer100g` populated for every recipe.
 *
 * A recipe's nutrition is summed from its ingredient mappings against the BLS
 * and USDA tables — too slow to do per request, so the result is cached on the
 * document. Editing a recipe (or regenerating its mappings) unsets the field,
 * which marks it "never calculated"; an explicit null means "calculated, and
 * there was nothing usable", and is what stops a recipe with no mappings from
 * being retried forever.
 *
 * Called from two places: the server's startup warmup, so the first visitor
 * after a deploy never waits for it, and the listing endpoint, so an edit made
 * while the server is running is picked up without a restart.
 */
import { Recipe } from '$models/Recipe';
import { computePer100g } from '$lib/server/recipePer100g';

export type NutritionFillResult = {
	/** Recipes that gained usable figures. */
	filled: number;
	/** Recipes marked as having nothing to calculate. */
	empty: number;
};

export async function fillMissingRecipeNutrition(): Promise<NutritionFillResult> {
	const missing = await Recipe.find(
		{ cachedPer100g: { $exists: false } },
		{ ingredients: 1, nutritionMappings: 1 }
	).lean();
	if (missing.length === 0) return { filled: 0, empty: 0 };

	let filled = 0;
	let empty = 0;
	const ops = missing.map((recipe) => {
		const result = computePer100g(recipe);
		if (result) filled++;
		else empty++;
		return {
			updateOne: {
				filter: { _id: recipe._id },
				update: {
					$set: {
						cachedPer100g: result?.per100g ?? null,
						cachedTotalGrams: result?.totalGrams ?? 0
					}
				}
			}
		};
	});

	await Recipe.bulkWrite(ops);
	return { filled, empty };
}
