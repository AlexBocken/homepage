/**
 * The recipes a recipe builds on, and what they contribute.
 *
 * A recipe can name another two ways: a `type: 'reference'` ingredient section
 * carrying `baseRecipeRef` and a `baseMultiplier`, or an ordinary ingredient
 * whose name links to one. Both mean the same thing — that recipe's whole
 * output goes into this one — and both were resolved in `nutritionMatcher`,
 * which pulls in @huggingface/transformers and so cannot be imported by the
 * listing path. That is why the per-100 g cache left base recipes out entirely:
 * a pizza's dough was simply missing from the card's macros.
 *
 * Which recipe a reference means is `recipeReferenceLinks`' job; this module sums
 * what it contributes and `recipePer100g` does the per-100 g arithmetic. It
 * imports neither the embedding models nor the matcher, so anything that can
 * reach Mongo can reach it.
 *
 * Referenced recipes are resolved one level deep. A base recipe that itself
 * builds on another contributes that one too, and a `visited` set keeps a cycle
 * — two recipes naming each other — from recursing forever.
 */
import { computeTotals, type ReferencedTotals } from '$lib/server/recipePer100g';
import { collectRequests, loadReferencedRecipes } from '$lib/server/recipeReferenceLinks';
import { resolveFinalWeight } from '$lib/js/finalWeight';

/**
 * Resolve everything a recipe builds on into totals that can be added to it.
 *
 * `visited` carries the slugs already accounted for. It is both the cycle guard
 * and the deduplicator: a recipe naming the same base twice contributes it once,
 * which is what the old resolver did too.
 */
export async function resolveReferences(
	ingredients: any[],
	mappings?: any[],
	visited: Set<string> = new Set(),
): Promise<ReferencedTotals[]> {
	const refs = await loadReferencedRecipes(collectRequests(ingredients, mappings));

	const results: ReferencedTotals[] = [];
	for (const { request: req, doc } of refs) {
		if (visited.has(doc.short_name)) continue;
		visited.add(doc.short_name);

		// The base recipe's own bases, so a dough built on a starter carries it.
		const nested = await resolveReferences(doc.ingredients || [], doc.nutritionMappings, visited);

		const own = computeTotals(doc);
		const totals = { ...own.totals };
		let totalGrams = own.totalGrams;
		let mapped = own.mapped;
		let mappable = own.mappable;
		for (const n of nested) {
			const scale = n.baseMultiplier || 1;
			totalGrams += n.totalGrams * scale;
			for (const [k, v] of Object.entries(n.nutrition)) {
				totals[k] = (totals[k] ?? 0) + v * scale;
			}
			// A base built on a half-mapped base is itself half a guess, so its
			// lines join the count rather than being averaged in as one row.
			mapped += n.mapped;
			mappable += n.mappable;
		}

		if (totalGrams <= 0) continue;

		// What the parent actually puts in is the finished base, not the raw sum:
		// 1 kg of dough ingredients goes into the oven and 900 g of bread comes out.
		const finishedGrams = resolveFinalWeight(totalGrams, doc.finalWeight);
		if (finishedGrams <= 0) continue;

		results.push({
			shortName: doc.short_name,
			name: doc.name,
			sectionIndex: req.sectionIndex,
			...(req.ingredientIndex !== undefined && { ingredientIndex: req.ingredientIndex }),
			nutrition: totals,
			totalGrams: finishedGrams,
			baseMultiplier: req.baseMultiplier,
			mapped,
			mappable,
			coverage: mappable > 0 ? mapped / mappable : 1,
		});
	}

	return results;
}
