/**
 * Which recipes a recipe names, and how to fetch them.
 *
 * Only the *link* half of a base-recipe reference lives here: reading the two
 * ways one recipe can name another, and turning that into documents. What those
 * documents then contribute — nutrients, weight, coverage — is `recipeReferences`
 * for the recipe pages and `foodLogComponents` for the diary, and both go through
 * this module so they can never disagree about which recipe was meant or how much
 * of it was used. Reimplementing the reading half in the food log is exactly what
 * left a pizza's dough out of every logged entry while the recipe page counted it.
 *
 * Deliberately free of `recipePer100g`, which loads the BLS and USDA tables at
 * import: the log's decomposition needs the references but not the numbers.
 */
import { Recipe } from '$models/Recipe';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';

/** The fields a referenced recipe must carry to be summed. `finalWeight` among
 *  them: a base recipe that loses water in the oven puts its *finished* weight
 *  into the parent, and leaving the field out of the projection silently made
 *  every hand-set finished weight an `auto` one. */
const REF_FIELDS = 'short_name name ingredients nutritionMappings finalWeight';

export type RefRequest = {
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
export function collectRequests(ingredients: any[], mappings: any[] | undefined): RefRequest[] {
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
			// A fraction of 0 says the linked recipe isn't used — an alternative or an
			// optional side. `excluded` can't say it: on a link line it already means
			// "don't count this line's own entry", which every reference sets.
			if (mapping?.recipeRefMultiplier === 0) return;
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
 * Load the recipe behind each request, in request order, dropping the ones that
 * resolve to nothing.
 *
 * One query for the whole batch. A `type: 'reference'` section stores an ObjectId,
 * which is a populated document only if the caller asked for one — so both a slug
 * and a bare id have to be answerable here, and a caller that skips the
 * `.populate()` (the food log does) still sees its base recipes.
 */
export async function loadReferencedRecipes(
	requests: RefRequest[],
): Promise<Array<{ request: RefRequest; doc: any }>> {
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

	const out: Array<{ request: RefRequest; doc: any }> = [];
	for (const request of requests) {
		const doc: any = request.slug
			? (bySlug.get(request.slug) ?? bySlug.get(swapSeparators(request.slug)))
			: byId.get(String(request.id));
		if (doc) out.push({ request, doc });
	}
	return out;
}
