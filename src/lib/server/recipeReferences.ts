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
 * This module does the database half; `recipePer100g` does the arithmetic. It
 * imports neither the embedding models nor the matcher, so anything that can
 * reach Mongo can reach it.
 *
 * Referenced recipes are resolved one level deep. A base recipe that itself
 * builds on another contributes that one too, and a `visited` set keeps a cycle
 * — two recipes naming each other — from recursing forever.
 */
import { Recipe } from '$models/Recipe';
import { computeTotals, type ReferencedTotals } from '$lib/server/recipePer100g';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';

/** The fields a referenced recipe must carry to be summed. */
const REF_FIELDS = 'short_name name ingredients nutritionMappings';

type RefRequest = {
	slug?: string;
	id?: unknown;
	baseMultiplier: number;
	sectionIndex: number;
	ingredientIndex?: number;
};

/** The same slug in the other separator convention, or itself if it has neither. */
function swapSeparators(slug: string): string {
	if (slug.includes('_')) return slug.replace(/_/g, '-');
	if (slug.includes('-')) return slug.replace(/-/g, '_');
	return slug;
}

/** Every recipe this one names, with the fraction of each that it uses. */
function collectRequests(ingredients: any[], mappings: any[] | undefined): RefRequest[] {
	// An anchor reference's fraction lives on its mapping, so the user can say
	// "half a batch of dough" without editing the ingredient line.
	const byRef = new Map(
		(mappings ?? []).filter((m: any) => m.recipeRef).map((m: any) => [m.recipeRef, m])
	);

	const out: RefRequest[] = [];
	// Position-keyed, so a mapping's stored `recipeRef` can override the link in
	// the ingredient's name — the link may point at a slug that no longer exists,
	// or at nothing at all when the reference was set by hand.
	const byIndex = new Map(
		(mappings ?? []).map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
	);

	ingredients?.forEach((section: any, si: number) => {
		if (section?.type === 'reference' && section.baseRecipeRef) {
			const ref = section.baseRecipeRef;
			// Populated document or a bare ObjectId, depending on the caller's query.
			const slug = typeof ref === 'object' && ref?.short_name ? ref.short_name : undefined;
			out.push({
				slug,
				id: slug ? undefined : ref,
				baseMultiplier: section.baseMultiplier || 1,
				sectionIndex: si,
			});
			return;
		}
		(section?.list ?? []).forEach((item: any, ii: number) => {
			const mapping = byIndex.get(`${si}-${ii}`);
			const slug = mapping?.recipeRef || parseAnchorRecipeRef(item?.name || '');
			if (!slug) return;
			out.push({
				slug,
				baseMultiplier: mapping?.recipeRefMultiplier ?? byRef.get(slug)?.recipeRefMultiplier ?? 1,
				sectionIndex: si,
				ingredientIndex: ii,
			});
		});
	});
	return out;
}

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
	const requests = collectRequests(ingredients, mappings);
	if (requests.length === 0) return [];

	const slugs = requests.map((r) => r.slug).filter((s): s is string => !!s);
	const ids = requests.map((r) => r.id).filter(Boolean);

	// Recipe slugs were once written with underscores and are now hyphenated, and
	// the links inside older ingredient names were never rewritten: ten of them
	// point at poulet_bouillon, levito_madre and birnen_mit_preiselbeeren, none of
	// which exist while all three do under the current spelling. Both forms are
	// asked for, and the separator is the only thing that may differ — anything
	// else is a genuinely wrong link, which the editor lets you repoint by hand.
	const wanted = [...new Set(slugs.flatMap((s) => [s, swapSeparators(s)]))];

	const or: Record<string, unknown>[] = [];
	if (wanted.length) or.push({ short_name: { $in: wanted } });
	if (ids.length) or.push({ _id: { $in: ids } });
	if (or.length === 0) return [];

	const docs = await Recipe.find({ $or: or }).select(REF_FIELDS).lean();
	const bySlug = new Map(docs.map((d: any) => [d.short_name, d]));
	const byId = new Map(docs.map((d: any) => [String(d._id), d]));

	const results: ReferencedTotals[] = [];
	for (const req of requests) {
		const doc: any = req.slug
			? (bySlug.get(req.slug) ?? bySlug.get(swapSeparators(req.slug)))
			: byId.get(String(req.id));
		if (!doc) continue;
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

		results.push({
			shortName: doc.short_name,
			name: doc.name,
			sectionIndex: req.sectionIndex,
			...(req.ingredientIndex !== undefined && { ingredientIndex: req.ingredientIndex }),
			nutrition: totals,
			totalGrams,
			baseMultiplier: req.baseMultiplier,
			mapped,
			mappable,
			coverage: mappable > 0 ? mapped / mappable : 1,
		});
	}

	return results;
}
