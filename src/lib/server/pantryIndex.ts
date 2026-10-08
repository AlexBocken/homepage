/**
 * The pantry search index ($lib/server/pantryVocabulary), cached in memory.
 * Building it takes a few milliseconds, so it is simply built on the first
 * request after recipes change ($lib/server/recipeChanges) rather than kept
 * warm in the background.
 */
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { onRecipesChanged } from '$lib/server/recipeChanges';
import { buildPantryIndex, type PantrySource } from '$lib/server/pantryVocabulary';
import type { PantryIndex } from '$lib/js/pantryMatch';

let cached: PantryIndex | null = null;
let building: Promise<PantryIndex> | null = null;
/** Bumped on every change, so a build that read the old recipes isn't cached. */
let generation = 0;

onRecipesChanged('pantry', () => {
	generation++;
	cached = null;
});

/** The current index, built on first use after a change. */
export async function getPantryIndex(): Promise<PantryIndex> {
	if (cached) return cached;
	building ??= (async () => {
		const gen = generation;
		await dbConnect();
		const docs = await Recipe.find({}, 'short_name ingredients translations.en.ingredients').lean<PantrySource[]>();
		const t0 = performance.now();
		const index = buildPantryIndex(docs);
		console.log(
			`[pantry] indexed ${index.items.length} ingredients over ${docs.length} recipes in ${Math.round(performance.now() - t0)}ms`,
		);
		if (gen === generation) cached = index;
		return index;
	})().finally(() => {
		building = null;
	});
	return building;
}
