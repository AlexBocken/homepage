import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { usdaDisplayName } from '$lib/data/usdaNamesDe';
import { BLS_DB } from '$lib/data/blsDb';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FavoriteIngredient } from '$models/FavoriteIngredient';
import { Recipe } from '$models/Recipe';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { getBlsEntryByCode, getNutritionEntryByFdcId } from '$lib/server/nutritionMatcher';
import { searchBlsUsda, scoreName, queryWords, NAME_LENGTH_PENALTY } from '$lib/server/nutritionSearchIndex';
import { offPortions } from '$lib/server/offPortions';
import { offPer100gToAppUnits } from '$lib/fitness/offUnits';
import { resolveBarcodeOverrides } from '$lib/server/barcodeOverrides';
import { groupsPresent } from '$lib/fitness/microCoverage';

type SearchResult = {
	source: 'bls' | 'usda' | 'recipe' | 'off';
	id: string;
	name: string;
	category: string;
	calories: number;
	favorited?: boolean;
	/** Which nutrient groups this record reports — Open Food Facts entries never carry amino acids. */
	microGroups?: { minerals: boolean; vitamins: boolean; aminos: boolean };
	per100g?: any;
	portions?: any[];
	brands?: string;
	icon?: string;
	image?: string;
};

/**
 * Ranking bonus for how complete a record's nutrition data is: 8 points per
 * nutrient group reported (minerals, vitamins, essential amino acids), so a full
 * BLS/USDA entry gains 24 over an Open Food Facts one, which declares a mineral
 * or two at best and never any amino acids.
 *
 * Deliberately a nudge, not a tier: typical name scores run 20-80, so a clearly
 * better OFF match still outranks a weak BLS one — you can find your branded
 * yoghurt — while equal-quality matches favour the source that can actually fill
 * the micronutrient breakdown. Quality-based rather than source-based, so a
 * sparse USDA record earns less of it too.
 */
const COVERAGE_BONUS_PER_GROUP = 8;

function coverageBonus(groups: { minerals: boolean; vitamins: boolean; aminos: boolean }): number {
	return (Number(groups.minerals) + Number(groups.vitamins) + Number(groups.aminos)) * COVERAGE_BONUS_PER_GROUP;
}

const ALL_SOURCES = ['recipe', 'bls', 'usda', 'off'] as const;
type Source = (typeof ALL_SOURCES)[number];

// --- Ready-meal exclusion (`hideReadyMeals=true`) ---
// Drops finished dishes so a search surfaces ingredients instead. BLS and USDA
// have fixed category lists, so they're matched exactly. OFF's `category` is the
// most specific free-form tag off the product, so it can only be keyword-matched
// — `\b` anchors keep "meal" from eating oatmeal/cornmeal. User recipes are never
// filtered: they're the user's own, and being a finished dish is the point.
const READY_MEAL_BLS = new Set(['Brühen & Fertiggerichte', 'Gerichte & Rezepte']);
const READY_MEAL_USDA = new Set(['Restaurant Foods', 'Soups, Sauces, and Gravies']);
const READY_MEAL_OFF_RE =
	/\b(ready[ -]?(made|to[ -]eat|meals?)|meals?|prepared|convenience|pizzas?|quiches?|sandwiches|sandwich|burgers?|soups?|broths?|bouillons?|stews?|casseroles?|lasagnas?|gratins?|dishes|dish|entrees?|dinners?)\b/i;

function isReadyMeal(source: Source, category: string | undefined): boolean {
	if (!category) return false;
	if (source === 'bls') return READY_MEAL_BLS.has(category);
	if (source === 'usda') return READY_MEAL_USDA.has(category);
	if (source === 'off') return READY_MEAL_OFF_RE.test(category);
	return false;
}

function lookupBls(blsCode: string, full: boolean): SearchResult | null {
	const entry = BLS_DB.find(e => e.blsCode === blsCode);
	if (!entry) return null;
	return {
		source: 'bls',
		id: entry.blsCode,
		name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
		category: entry.category,
		calories: entry.per100g.calories,
		microGroups: groupsPresent(entry.per100g),
		...(full && { per100g: entry.per100g }),
	};
}

function lookupUsda(fdcId: string, full: boolean): SearchResult | null {
	const entry = NUTRITION_DB.find(e => String(e.fdcId) === fdcId);
	if (!entry) return null;
	return {
		source: 'usda',
		id: String(entry.fdcId),
		name: usdaDisplayName(entry.name),
		category: entry.category,
		calories: entry.per100g.calories,
		microGroups: groupsPresent(entry.per100g),
		...(full && { per100g: entry.per100g, portions: entry.portions }),
	};
}

/** Parse ingredient amount string to a number */
function parseAmount(amount: string | undefined): number {
	if (!amount?.trim()) return 0;
	let s = amount.trim().replace(',', '.');
	const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
	if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
	const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
	const parsed = parseFloat(s);
	return isNaN(parsed) ? 0 : parsed;
}

/** Compute per-100g nutrition for a recipe from its ingredients + nutritionMappings */
function computeRecipePer100g(recipe: any): { per100g: Record<string, number>; totalGrams: number } | null {
	const mappings = recipe.nutritionMappings;
	if (!mappings?.length) return null;

	// Every numeric key an ingredient carries is summed, amino acids included —
	// a fixed list silently drops whatever it forgets, which is how recipes ended
	// up reporting no amino acids at all.
	const totals: Record<string, number> = {};
	let totalGrams = 0;

	// Build mapping index
	const mappingIndex = new Map<string, any>();
	for (const m of mappings) {
		mappingIndex.set(`${m.sectionIndex}-${m.ingredientIndex}`, m);
	}

	// Resolve per100g for each mapping and sum
	for (const m of mappings) {
		if (m.matchMethod === 'none' || m.excluded || !m.gramsPerUnit) continue;

		let per100g = m.per100g;
		if (!per100g) {
			// Resolve from DB
			if (m.source === 'bls' && m.blsCode) {
				per100g = getBlsEntryByCode(m.blsCode)?.per100g;
			} else if (m.fdcId) {
				per100g = getNutritionEntryByFdcId(m.fdcId)?.per100g;
			}
		}
		if (!per100g) continue;

		// Find the ingredient in the recipe to get its amount
		const section = recipe.ingredients?.[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const ing = items[m.ingredientIndex];
		const parsedAmount = (ing ? parseAmount(ing.amount) : 0) || (m.defaultAmountUsed ? 1 : 0);

		const grams = parsedAmount * m.gramsPerUnit;
		totalGrams += grams;
		const factor = grams / 100;
		for (const [k, v] of Object.entries(per100g as Record<string, unknown>)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + factor * v;
		}
	}

	if (totalGrams <= 0) return null;

	const per100g: Record<string, number> = {};
	for (const [k, v] of Object.entries(totals)) per100g[k] = v / totalGrams * 100;
	return { per100g, totalGrams };
}

/** GET: Search recipes, BLS, USDA, and OpenFoodFacts by fuzzy name match */
export const GET: RequestHandler = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') || '').toLowerCase().trim();
	if (q.length < 2) return json([]);

	const full = url.searchParams.get('full') === 'true';
	const wantFavorites = url.searchParams.get('favorites') === 'true';

	// `sources` narrows the search to a subset of the databases. Absent (or listing
	// none we know) means all of them — the ranking below already mixes sources, so
	// filtering has to happen here rather than client-side: the top-30 cut would
	// otherwise leave a single-source view with only the few rows that survived it.
	const requested = (url.searchParams.get('sources') || '')
		.split(',')
		.map(s => s.trim())
		.filter((s): s is Source => (ALL_SOURCES as readonly string[]).includes(s));
	const sources = new Set<Source>(requested.length > 0 ? requested : ALL_SOURCES);
	const hideReadyMeals = url.searchParams.get('hideReadyMeals') === 'true';

	// Optionally load user favorites
	let favResults: SearchResult[] = [];
	let favKeys = new Set<string>();

	// Favourite keys are loaded for every logged-in caller, not just ?favorites=true.
	// Marking a result as favourited (heart in the row, ranked to the top) needs only
	// the keys, and that is a single indexed query. Hydrating the *full* favourites
	// list into results is the expensive part — a recipe fetch plus per-100g compute
	// per favourite — and stays behind the flag.
	try {
		const user = await requireAuth(locals);
		await dbConnect();
		const favDocs = await FavoriteIngredient.find({ createdBy: user.nickname }).lean();
		for (const fav of favDocs) favKeys.add(`${fav.source}:${fav.sourceId}`);

		if (wantFavorites) {

			// Batch-load favorited recipes
			const recipeFavIds = favDocs.filter(f => (f.source as string) === 'recipe').map(f => f.sourceId);
			const favRecipes = recipeFavIds.length > 0
				? await Recipe.find({
					$or: recipeFavIds.map(id =>
						id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { short_name: id }
					)
				}).select('name short_name icon images ingredients nutritionMappings portions').lean()
				: [];
			const favRecipeMap = new Map<string, any>();
			for (const r of favRecipes) {
				favRecipeMap.set(String(r._id), r);
				favRecipeMap.set(r.short_name, r);
			}

			for (const fav of favDocs) {
				if (!sources.has(fav.source as Source)) continue;
				let result: SearchResult | null = null;
				if (fav.source === 'bls') {
					result = lookupBls(fav.sourceId, full);
				} else if (fav.source === 'usda') {
					result = lookupUsda(fav.sourceId, full);
				} else if ((fav.source as string) === 'recipe') {
					const r = favRecipeMap.get(fav.sourceId);
					if (r) {
						const nutrition = computeRecipePer100g(r);
						const image = r.images?.[0]?.mediapath;
						result = {
							source: 'recipe',
							id: String(r._id),
							name: r.name.replace(/&shy;|­/g, ''),
							category: r.icon || '🍽️',
							calories: Math.round(nutrition?.per100g.calories ?? 0),
							microGroups: groupsPresent(nutrition?.per100g),
							...(full && nutrition && { per100g: nutrition.per100g }),
							...(image && { image }),
						};
					}
				}
				if (result && hideReadyMeals && isReadyMeal(fav.source as Source, result.category)) continue;
				if (result) {
					result.favorited = true;
					favResults.push(result);
				}
			}
		}
	} catch {
		// Not authenticated or DB error — ignore, just return normal results
	}

	const scored: (SearchResult & { score: number })[] = [];

	// Search recipes + OFF in parallel with BLS/USDA (which are in-memory)
	await dbConnect();
	const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// Punctuation-free words, so "peppers, bell" looks for "peppers" AND "bell"
	// rather than the literal token "peppers,".
	const words = queryWords(q);
	const nameRegex = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join('') + '.*';

	const [recipes, offResults] = await Promise.all([
		!sources.has('recipe') ? [] as any[] : Recipe.find({
			$or: [
				{ name: { $regex: nameRegex, $options: 'i' } },
				{ short_name: { $regex: nameRegex, $options: 'i' } },
				{ tags: { $regex: escaped, $options: 'i' } },
			]
		}).select('name short_name icon images ingredients nutritionMappings portions').limit(10).lean()
			.catch(() => [] as any[]),
		// NOTE: no `.sort({ $meta: 'textScore' })`. Sorting by text score forces
		// Mongo to score every matching doc before limiting — 100ms–1s+ for common
		// words over the 1M-doc OFF collection. We instead fetch a larger unsorted
		// candidate pool (the `limit` short-circuits the index scan, ~1–5ms) and
		// re-rank with scoreName below, which already overrode textScore anyway.
		!sources.has('off') ? [] as any[] : OpenFoodFact.find(
			{ $text: { $search: q } },
			// `serving` + `productQuantityG` are needed even in the slim projection —
			// offPortions() derives the package portion from them.
			// The slim projection also pulls the micro probe keys so `hasMicros` can be
			// reported per row — same documents, a handful of extra numbers each.
			full ? {} : {
				barcode: 1, name: 1, nameDe: 1, brands: 1, category: 1, serving: 1, productQuantityG: 1,
				'per100g.calories': 1, 'per100g.calcium': 1, 'per100g.iron': 1, 'per100g.magnesium': 1,
				'per100g.phosphorus': 1, 'per100g.potassium': 1, 'per100g.zinc': 1, 'per100g.vitaminA': 1,
				'per100g.vitaminC': 1, 'per100g.vitaminE': 1, 'per100g.thiamin': 1, 'per100g.riboflavin': 1,
				'per100g.niacin': 1, 'per100g.folate': 1,
			}
		).limit(200).lean()
			.catch(() => [] as any[]),
	]);

	// Process recipe results (highest priority — scored with bonus)
	for (const r of recipes as any[]) {
		// scoreName, not fuzzyScore: the Mongo query above already matches words in
		// any order, so ranking must too — otherwise "bolognese ragu" finds the
		// recipe and then throws it away for scoring 0.
		const nameScore = scoreName(q, words, (r.name || '').toLowerCase());
		const scoreShort = scoreName(q, words, (r.short_name || '').replace(/_/g, ' ').toLowerCase());
		const best = Math.max(nameScore, scoreShort);
		if (best <= 0) continue;
		const lenPenalty = (r.name || '').length * NAME_LENGTH_PENALTY;

		const nutrition = computeRecipePer100g(r);
		const image = r.images?.[0]?.mediapath;
		const portionsMatch = r.portions?.match(/^(\d+(?:[.,]\d+)?)/);
		const portionCount = portionsMatch ? parseFloat(portionsMatch[1].replace(',', '.')) : 0;
		const portions: any[] = [];
		if (portionCount > 0 && nutrition) {
			const gramsPerPortion = Math.round(nutrition.totalGrams / portionCount);
			portions.push({ description: '1 Portion', grams: gramsPerPortion });
		}

		const recipeId = String(r._id);
		scored.push({
			source: 'recipe',
			id: recipeId,
			name: r.name.replace(/&shy;|­/g, ''),
			category: r.icon || '🍽️',
			calories: Math.round(nutrition?.per100g.calories ?? 0),
			microGroups: groupsPresent(nutrition?.per100g),
			score: best + 100 - lenPenalty, // Boost recipes above BLS/USDA/OFF; shorter names first
			...(full && nutrition && { per100g: nutrition.per100g }),
			...(portions.length > 0 && { portions }),
			...(image && { image }),
			...((favKeys.has(`recipe:${recipeId}`) || favKeys.has(`recipe:${r.short_name}`)) && { favorited: true }),
		});
	}

	// Search BLS + USDA via the diacritic-folded inverted prefix index (only the
	// candidate entries get fuzzy-scored, instead of a linear scan of all ~20k).
	for (const hit of searchBlsUsda(q)) {
		if (!sources.has(hit.source)) continue;
		if (hit.source === 'bls') {
			const entry = BLS_DB[hit.idx];
			if (hideReadyMeals && isReadyMeal('bls', entry.category)) continue;
			const blsGroups = groupsPresent(entry.per100g);
			scored.push({
				source: 'bls',
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				category: entry.category,
				calories: entry.per100g.calories,
				microGroups: blsGroups,
				score: hit.score + coverageBonus(blsGroups),
				...(full && { per100g: entry.per100g }),
				...(favKeys.has(`bls:${entry.blsCode}`) && { favorited: true }),
			});
		} else {
			const entry = NUTRITION_DB[hit.idx];
			if (hideReadyMeals && isReadyMeal('usda', entry.category)) continue;
			const usdaGroups = groupsPresent(entry.per100g);
			scored.push({
				source: 'usda',
				id: String(entry.fdcId),
				name: usdaDisplayName(entry.name),
				category: entry.category,
				calories: entry.per100g.calories,
				microGroups: usdaGroups,
				score: hit.score + coverageBonus(usdaGroups),
				...(full && { per100g: entry.per100g, portions: entry.portions }),
				...(favKeys.has(`usda:${entry.fdcId}`) && { favorited: true }),
			});
		}
	}

	// Process OpenFoodFacts results
	{
		// A mapped barcode surfaces as its BLS/USDA entry here too, so the same
		// product can't show two different nutrition profiles depending on whether
		// it was scanned or searched for.
		const overrides = await resolveBarcodeOverrides(
			(offResults as any[]).map((e) => e.barcode).filter(Boolean)
		);
		// The mapping target may also have matched the query on its own name; keep
		// the direct hit and drop the duplicate.
		const seenKeys = new Set(scored.map((s: any) => `${s.source}:${s.id}`));

		for (const entry of offResults as any[]) {
			if (hideReadyMeals && isReadyMeal('off', entry.category)) continue;
			const displayName = entry.nameDe || entry.name;
			// Use fuzzy score for ranking consistency with BLS/USDA
			const scoreDe = entry.nameDe ? scoreName(q, words, entry.nameDe.toLowerCase()) : 0;
			const scoreEn = scoreName(q, words, entry.name.toLowerCase());
			const scoreBrand = entry.brands ? scoreName(q, words, entry.brands.toLowerCase()) : 0;
			// text search already filtered; prefer shorter names among matches
			const best = Math.max(scoreDe, scoreEn, scoreBrand, 1) - displayName.length * NAME_LENGTH_PENALTY;

			const override = overrides.get(entry.barcode);
			if (override) {
				if (hideReadyMeals && isReadyMeal(override.source, override.category || '')) continue;
				const key = `${override.source}:${override.id}`;
				if (seenKeys.has(key)) continue;
				seenKeys.add(key);
				const overrideGroups = groupsPresent(override.per100g);
				scored.push({
					source: override.source,
					id: override.id,
					// Ranked on the brand text the user actually typed, then shown as
					// the BLS/USDA record it resolves to.
					name: override.name,
					category: override.category || '',
					calories: override.calories,
					microGroups: overrideGroups,
					score: best + coverageBonus(overrideGroups),
					...(full && { per100g: override.per100g }),
					...(full && override.portions.length > 0 && { portions: override.portions }),
					...(favKeys.has(key) && { favorited: true }),
				});
				continue;
			}

			const portions = offPortions(entry);
			const offGroups = groupsPresent(entry.per100g);

			scored.push({
				source: 'off',
				id: entry.barcode,
				name: displayName,
				category: entry.category || '',
				calories: entry.per100g?.calories ?? 0,
				microGroups: offGroups,
				brands: entry.brands,
				score: best + coverageBonus(offGroups),
				// Stored in OFF's grams-for-everything convention; converted on read.
				...(full && { per100g: offPer100gToAppUnits(entry.per100g) }),
				...(portions.length > 0 && { portions }),
				...(favKeys.has(`off:${entry.barcode}`) && { favorited: true }),
			});
		}
	}

	// Favourites first, then by score. Sorting before the top-30 cut matters: a
	// favourite that matches the query must not be truncated away by higher-scoring
	// non-favourites.
	scored.sort((a, b) => {
		if (!!a.favorited !== !!b.favorited) return a.favorited ? -1 : 1;
		return b.score - a.score;
	});
	const searchResults = scored.slice(0, 30).map(({ score, ...rest }) => rest);

	// Prepend favorites, deduplicating
	if (favResults.length > 0) {
		const searchKeys = new Set(searchResults.map(r => `${r.source}:${r.id}`));
		const uniqueFavs = favResults.filter(f => !searchKeys.has(`${f.source}:${f.id}`));
		return json([...uniqueFavs, ...searchResults]);
	}

	return json(searchResults);
};
