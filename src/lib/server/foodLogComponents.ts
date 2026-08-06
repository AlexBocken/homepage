/**
 * Food-log components: the diary stores *references* to the base tables, not
 * snapshots of their numbers.
 *
 * A logged entry is a set of **leaf refs** — and a leaf is always bls/usda/off, a
 * row in a catalog we control. What you ate and how much (the composition) is
 * frozen; the per-100 g values are resolved live from the tables on read, so a fix
 * to a BLS entry propagates to every day it was eaten. Recipes and custom meals are
 * decomposed into their leaves at log time, so they get the same live values while
 * their *composition* stays as it was when logged.
 *
 * This module is the single place that (a) decomposes a logged food / meal / recipe
 * into frozen leaf refs and (b) resolves a batch of leaf refs back to nutrition.
 * The logger, the copy-day endpoint and the one-time migration all go through it,
 * so decomposition can never drift between "log now" and "convert the backlog".
 *
 * Server-only: it reads the Open Food Facts mirror from Mongo and the BLS/USDA
 * tables from memory.
 */

import { offPer100gToAppUnits } from '$lib/fitness/offUnits';
import { ingredientGrams } from '$lib/js/ingredientAmount';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';
import { resolveFinalWeight } from '$lib/js/finalWeight';

// The BLS/USDA table accessors and the USDA display-name map are imported lazily
// inside resolveLeaves rather than at the top: they pull in nutritionMatcher, which
// depends on SvelteKit's `$app/server`. Keeping them out of the module's static
// graph lets the pure decomposition helpers (foodLeaf, mealLeaves, blendPer100g …)
// be imported from a plain test or script without booting the app.
async function tableAccessors() {
	const [{ getBlsEntryByCode, getNutritionEntryByFdcId }, { usdaDisplayName }] = await Promise.all([
		import('$lib/server/nutritionMatcher'),
		import('$lib/data/usdaNamesDe'),
	]);
	return { getBlsEntryByCode, getNutritionEntryByFdcId, usdaDisplayName };
}

/** Sources a leaf can reference. bls/usda/off resolve live from a base table.
 *  `frozen` is a migration-only fallback: an entry logged from a meal/recipe that
 *  was edited beyond recognition afterwards, whose decomposition no longer matches
 *  what was eaten, keeps its old blended snapshot inline instead. New logs never
 *  produce it — recipes contribute only bls/usda, and a manual/unmatched recipe
 *  mapping is dropped, exactly as the recipe's own total already treats it. */
export type LeafSource = 'bls' | 'usda' | 'off' | 'frozen';

export type Portion = { description: string; grams: number };

/** A leaf of a diary entry. For bls/usda/off, `sourceId` references a base table and
 *  nutrition is looked up live; `amountGrams`, `portions` and the picked portion are
 *  the frozen parts. For a `frozen` leaf, `per100g` carries the historical snapshot
 *  directly and nothing is resolved. */
export type LeafRef = {
	source: LeafSource;
	sourceId: string;
	amountGrams: number;
	portions?: Portion[];
	selectedPortion?: Portion;
	/** Only for `frozen` leaves: the inline historical nutrition. */
	per100g?: Per100g;
};

/** What a diary row was logged as, for its badge, detail link and "log again". A
 *  plain food is one leaf; a meal/recipe is the decomposition of that reference. */
export type LoggedAs = { kind: 'food' | 'custom' | 'recipe'; refId?: string };

export type Per100g = Record<string, number>;

/** A leaf with its resolved nutrition and current display name, or `per100g: null`
 *  when the reference no longer points at anything (an OFF product aged out of the
 *  mirror, a USDA id dropped on re-import). Null is surfaced, never silently zeroed.
 *  `name` is the live base-table name, so a nutrient breakdown lists the food that
 *  actually supplied a nutrient — the meal's ingredient, not the meal. */
export type ResolvedLeaf = LeafRef & { per100g: Per100g | null; name: string | null };

const OFF_BATCH_PROJECTION = { barcode: 1, per100g: 1, name: 1, nameDe: 1, _id: 0 } as const;

type OffResolved = { per100g: Per100g; name: string | null };

/**
 * Resolve many leaf refs to nutrition in one pass. BLS and USDA come from the
 * in-memory tables (O(1) each); every OFF barcode is fetched in a single indexed
 * `$in`, so a 30-day window costs one query no matter how many OFF foods it holds.
 */
export async function resolveLeaves(refs: LeafRef[]): Promise<ResolvedLeaf[]> {
	const offIds = [...new Set(refs.filter(r => r.source === 'off').map(r => r.sourceId))];
	const offMap = new Map<string, OffResolved>();
	if (offIds.length) {
		// Imported lazily so this module stays usable from a plain script context
		// that has connected mongoose itself but not booted SvelteKit's aliases.
		const { OpenFoodFact } = await import('$models/OpenFoodFact');
		const docs = await OpenFoodFact.find({ barcode: { $in: offIds } }, OFF_BATCH_PROJECTION).lean();
		for (const d of docs as any[]) {
			offMap.set(String(d.barcode), {
				// Stored in OFF's grams-for-everything convention; converted on read.
				per100g: offPer100gToAppUnits(d.per100g as Per100g),
				name: d.nameDe || d.name || null,
			});
		}
	}

	const { getBlsEntryByCode, getNutritionEntryByFdcId, usdaDisplayName } = await tableAccessors();

	return refs.map(ref => {
		if (ref.source === 'frozen') {
			// Historical snapshot carried inline — nothing to resolve.
			return { ...ref, per100g: ref.per100g ?? null, name: null };
		}
		if (ref.source === 'bls') {
			const e = getBlsEntryByCode(ref.sourceId);
			return { ...ref, per100g: (e?.per100g as Per100g) ?? null, name: e ? (e.nameDe || e.nameEn || null) : null };
		}
		if (ref.source === 'usda') {
			const e = getNutritionEntryByFdcId(Number(ref.sourceId));
			return { ...ref, per100g: (e?.per100g as Per100g) ?? null, name: e ? usdaDisplayName(e.name) : null };
		}
		const off = offMap.get(ref.sourceId);
		return { ...ref, per100g: off?.per100g ?? null, name: off?.name ?? null };
	});
}

/**
 * Blend resolved leaves into one per-100 g figure. The denominator is the total
 * amount (dangling leaves included), so `blend[k] * totalGrams / 100` reproduces the
 * summed contribution of the leaves that *did* resolve — macros and minerals come
 * back exact. A key is present if any leaf reports it; on a mixed meal that slightly
 * overstates micronutrient *coverage* (the whole mass counts as measured) but never
 * the totals. Precision-sensitive readers iterate `components` instead.
 */
export function blendPer100g(comps: ResolvedLeaf[], totalGrams: number): Per100g {
	const totals: Record<string, number> = {};
	for (const c of comps) {
		if (!c?.per100g) continue;
		for (const [k, v] of Object.entries(c.per100g)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + v * c.amountGrams / 100;
		}
	}
	const out: Per100g = {};
	if (totalGrams > 0) for (const [k, v] of Object.entries(totals)) out[k] = v / totalGrams * 100;
	return out;
}

/** The top-level source/sourceId a diary row presents as — the leaf itself for a
 *  plain food, or the meal/recipe reference for a decomposed one. Reproduces the
 *  fields the pre-reference schema stored, for badges, detail links and dedup. */
function displayRef(entry: { loggedAs?: LoggedAs; components?: LeafRef[] }): { source: string; sourceId?: string } {
	const la = entry.loggedAs;
	if (la?.kind === 'custom') return { source: 'custom', sourceId: la.refId ? String(la.refId) : undefined };
	if (la?.kind === 'recipe') return { source: 'recipe', sourceId: la.refId ? String(la.refId) : undefined };
	const first = entry.components?.[0];
	return { source: first?.source ?? 'custom', sourceId: first?.sourceId };
}

export type HydratedEntry<E> = E & {
	components: ResolvedLeaf[];
	/** Derived: Σ component amounts. Never stored. */
	amountGrams: number;
	/** Blended live nutrition, back-compatible with the old snapshot field. */
	per100g: Per100g;
	/** Presentation reference (leaf for a food, meal/recipe for a composite). */
	source: string;
	sourceId?: string;
	/** Surfaced from the single leaf of a plain food so the amount label and the
	 *  edit modal keep working unchanged; absent for a multi-leaf meal/recipe. */
	portions?: Portion[];
	selectedPortion?: Portion;
};

/**
 * Resolve every component of a batch of entries with a single OFF round-trip, then
 * hand each entry back in the shape the rest of the app already expects — a blended
 * `per100g`, a derived `amountGrams`, and the presentation `source`/`sourceId` —
 * with the resolved `components` alongside for anything that needs per-leaf detail.
 */
export async function resolveEntries<E extends { loggedAs?: LoggedAs; components?: LeafRef[] }>(
	entries: E[],
): Promise<HydratedEntry<E>[]> {
	const all = entries.flatMap(e => e.components ?? []);
	const resolved = await resolveLeaves(all);

	let i = 0;
	return entries.map(e => {
		const comps = (e.components ?? []).map(() => resolved[i++]);
		const amountGrams = comps.reduce((sum, c) => sum + (c?.amountGrams ?? 0), 0);
		const single = comps.length === 1 ? comps[0] : undefined;
		return {
			...e,
			components: comps,
			amountGrams,
			per100g: blendPer100g(comps, amountGrams),
			...displayRef(e),
			...(single?.portions && { portions: single.portions }),
			...(single?.selectedPortion && { selectedPortion: single.selectedPortion }),
		};
	});
}

/** The flat list of every resolved leaf across a batch. This is the honest input
 *  for micronutrient coverage and the nutrient-contribution breakdown, where a meal
 *  must count as its ingredients, not as one blurred row. Each leaf's `name` is the
 *  live base-table food; the diary row's name is the fallback for a plain food whose
 *  reference no longer resolves. */
export function flattenComponents<E extends { name?: string }>(
	entries: (E & { components: ResolvedLeaf[] })[],
): Array<ResolvedLeaf & { name: string }> {
	return entries.flatMap(e => e.components.map(c => ({ ...c, name: c.name || e.name || '' })));
}

/**
 * Resolve a custom meal's own ingredients to live nutrition: the per-ingredient
 * resolved leaves (aligned to `meal.ingredients`), the meal's total weight, and its
 * blended per-100 g. For the meal editor, the food-detail page and the recipe-style
 * aggregation the diary does when logging a meal.
 */
export async function resolveMeal(meal: any): Promise<{
	ingredients: ResolvedLeaf[];
	totalGrams: number;
	per100g: Per100g;
}> {
	const ings: any[] = meal?.ingredients ?? [];
	const ingredients = await resolveLeaves(
		ings.map(i => ({ source: i.source, sourceId: i.sourceId, amountGrams: i.amountGrams ?? 0 })),
	);
	const totalGrams = ings.reduce((s, i) => s + (i?.amountGrams ?? 0), 0);
	return { ingredients, totalGrams, per100g: blendPer100g(ingredients, totalGrams) };
}

// ---------------------------------------------------------------- decomposition

/** A single food logged directly: one leaf, nothing to expand. */
export function foodLeaf(
	ref: { source: LeafSource; sourceId: string; portions?: Portion[]; selectedPortion?: Portion },
	amountGrams: number,
): LeafRef[] {
	return [{ source: ref.source, sourceId: ref.sourceId, amountGrams, portions: ref.portions, selectedPortion: ref.selectedPortion }];
}

/**
 * Expand a custom meal into leaf refs scaled to the logged amount. The meal's
 * ingredient grams sum to its own weight; a log of `amountGrams` takes that same
 * proportion of each ingredient. A legacy nested custom ingredient is flattened by
 * recursion so the result is always pure bls/usda/off.
 */
export async function mealLeaves(meal: any, amountGrams: number): Promise<LeafRef[]> {
	const ingredients: any[] = meal?.ingredients ?? [];
	const mealTotal = ingredients.reduce((s, ing) => s + (ing?.amountGrams ?? 0), 0);
	if (mealTotal <= 0) return [];
	const factor = amountGrams / mealTotal;

	const leaves: LeafRef[] = [];
	for (const ing of ingredients) {
		const grams = (ing?.amountGrams ?? 0) * factor;
		if (grams <= 0 || !ing?.sourceId) continue;
		if (ing.source === 'custom') {
			const { CustomMeal } = await import('$models/CustomMeal');
			const nested = await CustomMeal.findById(ing.sourceId).lean();
			if (nested) leaves.push(...await mealLeaves(nested, grams));
			continue;
		}
		leaves.push({
			source: ing.source,
			sourceId: String(ing.sourceId),
			amountGrams: grams,
			portions: ing.portions,
			selectedPortion: ing.selectedPortion,
		});
	}
	return leaves;
}

/**
 * The raw leaf breakdown of a recipe's own ingredients: one entry per resolvable
 * bls/usda mapping, with the grams that ingredient contributes at multiplier 1.
 *
 * Mirrors computeRecipeNutritionTotals' selection rules exactly — same section
 * dedup, same anchor-ref skip, same resolvePer100g gate — so the leaves sum to the
 * identical nutrition total, only itemised. Anchored sub-recipes are handled by
 * recipeLeaves; manual/unmatched mappings resolve to null and drop out, which is
 * how they already fail to count today.
 */
function directRecipeLeaves(ingredients: any[], mappings: any[]): { leaves: LeafRef[]; weightGrams: number } {
	const index = new Map((mappings || []).map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m]));
	const sectionNames = new Set<string>();
	for (const section of ingredients) {
		if (section?.name) sectionNames.add(stripHtml(section.name).toLowerCase().trim());
	}

	const leaves: LeafRef[] = [];
	let weightGrams = 0;
	for (let si = 0; si < ingredients.length; si++) {
		const section = ingredients[si];
		if (section?.type === 'reference' || !section?.list) continue;
		const currentSectionName = section.name ? stripHtml(section.name).toLowerCase().trim() : '';

		for (let ii = 0; ii < section.list.length; ii++) {
			const item = section.list[ii];
			const rawName = item?.name || '';
			const itemName = stripHtml(rawName).toLowerCase().trim();
			if (/<a\s/i.test(rawName)) continue;
			if (itemName && sectionNames.has(itemName) && itemName !== currentSectionName) continue;

			const mapping = index.get(`${si}-${ii}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded) continue;

			// A mapping contributes only if it points at a bls/usda leaf — the same gate
			// resolvePer100g applies in computeRecipeNutritionTotals, expressed purely so
			// this stays free of the server-only table lookups. A leaf whose base entry
			// has since vanished still becomes a reference and resolves to null later,
			// contributing zero nutrition just as a skipped mapping does.
			const leaf = mappingLeaf(mapping);
			if (!leaf) continue;

			const grams = ingredientGrams(mapping, item?.amount);
			if (grams <= 0) continue;
			weightGrams += grams;
			leaves.push({ ...leaf, amountGrams: grams });
		}
	}
	return { leaves, weightGrams };
}

/** The bls/usda reference a recipe mapping points at, matching resolvePer100g's
 *  own precedence (bls code first, then fdcId). */
function mappingLeaf(mapping: any): { source: LeafSource; sourceId: string } | null {
	if (mapping.blsCode && mapping.source === 'bls') return { source: 'bls', sourceId: String(mapping.blsCode) };
	if (mapping.fdcId != null) return { source: 'usda', sourceId: String(mapping.fdcId) };
	return null;
}

/**
 * Decompose a whole recipe into leaf refs scaled to the logged amount.
 *
 * Referenced sub-recipes (base-recipe sections and `<a href>` ingredient anchors)
 * are expanded one level deep and scaled by their multiplier — the same depth
 * resolveReferences uses, so the itemised leaves reproduce the recipe's
 * logged nutrition. Their mass is intentionally *not* added to the denominator, to
 * match how the recipe per-100 g is computed (weight counts direct ingredients
 * only); scaling every leaf by amountGrams/directWeight keeps the totals identical.
 */
export async function recipeLeaves(recipe: any, amountGrams: number): Promise<LeafRef[]> {
	const ingredients: any[] = recipe?.ingredients ?? [];
	const mappings: any[] = recipe?.nutritionMappings ?? [];

	const { leaves: direct, weightGrams } = directRecipeLeaves(ingredients, mappings);
	if (weightGrams <= 0) return [];

	const referenced = await referencedRecipeLeaves(ingredients, mappings);
	const all = [...direct, ...referenced];

	// 100 g of the logged dish is 100 g of what came out of the oven, so the share
	// of each ingredient it represents is measured against the finished weight.
	const finishedGrams = resolveFinalWeight(weightGrams, recipe?.finalWeight);
	if (finishedGrams <= 0) return [];

	const factor = amountGrams / finishedGrams;
	return all
		.map(l => ({ ...l, amountGrams: l.amountGrams * factor }))
		.filter(l => l.amountGrams > 0);
}

/** Leaves from referenced recipes — base-recipe sections and anchor-tag ingredient
 *  refs — each scaled by its own multiplier, at multiplier-1 grams (the outer
 *  recipeLeaves applies the log scale to everything together). */
async function referencedRecipeLeaves(ingredients: any[], mappings: any[]): Promise<LeafRef[]> {
	const { Recipe } = await import('$models/Recipe');
	const out: LeafRef[] = [];
	const seen = new Set<string>();

	const mappingByRef = new Map(
		(mappings || []).filter((m: any) => m.recipeRef).map((m: any) => [m.recipeRef, m]),
	);

	for (const section of ingredients) {
		if (section?.type === 'reference' && section.baseRecipeRef?.nutritionMappings?.length) {
			const ref = section.baseRecipeRef;
			if (seen.has(ref.short_name)) continue;
			seen.add(ref.short_name);
			const mult = section.baseMultiplier || 1;
			const { leaves } = directRecipeLeaves(ref.ingredients || [], ref.nutritionMappings);
			out.push(...leaves.map(l => ({ ...l, amountGrams: l.amountGrams * mult })));
		}

		for (const item of section?.list ?? []) {
			const slug = parseAnchorRecipeRef(item?.name || '');
			if (!slug || seen.has(slug)) continue;
			seen.add(slug);
			const refRecipe = await Recipe.findOne({ short_name: slug })
				.select('short_name ingredients nutritionMappings').lean();
			if (!(refRecipe as any)?.nutritionMappings?.length) continue;
			const mult = (mappingByRef.get(slug) as any)?.recipeRefMultiplier ?? 1;
			const { leaves } = directRecipeLeaves((refRecipe as any).ingredients || [], (refRecipe as any).nutritionMappings);
			out.push(...leaves.map(l => ({ ...l, amountGrams: l.amountGrams * mult })));
		}
	}
	return out;
}

// --------------------------------------------------------- shared parsing bits
// Kept local rather than exported from nutritionMatcher to avoid widening that
// module's surface; they must stay byte-identical in behaviour to the copies there.

function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}

// ------------------------------------------------------ top-level entry builder

export type LogInput = {
	loggedAs: LoggedAs;
	amountGrams: number;
	/** For kind 'food': the leaf being logged. */
	leaf?: { source: LeafSource; sourceId: string; portions?: Portion[]; selectedPortion?: Portion };
};

/**
 * Build the frozen `components` for a diary entry from a food / meal / recipe
 * reference. Returns an empty array when the reference can't be resolved (a deleted
 * meal, an unmatched recipe) — the caller decides whether that is a 400 (live
 * logging) or a skip (migration).
 */
export async function decomposeToComponents(input: LogInput): Promise<LeafRef[]> {
	const { loggedAs, amountGrams } = input;
	if (amountGrams <= 0) return [];

	if (loggedAs.kind === 'food') {
		if (!input.leaf?.sourceId) return [];
		return foodLeaf(input.leaf, amountGrams);
	}
	if (loggedAs.kind === 'custom') {
		if (!loggedAs.refId) return [];
		const { CustomMeal } = await import('$models/CustomMeal');
		const meal = await CustomMeal.findById(loggedAs.refId).lean();
		return meal ? mealLeaves(meal, amountGrams) : [];
	}
	// recipe
	if (!loggedAs.refId) return [];
	const { Recipe } = await import('$models/Recipe');
	const query = /^[0-9a-fA-F]{24}$/.test(loggedAs.refId) ? { _id: loggedAs.refId } : { short_name: loggedAs.refId };
	const recipe = await Recipe.findOne(query)
		.select('short_name ingredients nutritionMappings').lean();
	return recipe ? recipeLeaves(recipe, amountGrams) : [];
}
