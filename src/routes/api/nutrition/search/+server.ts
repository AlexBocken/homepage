import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { fuzzyScore } from '$lib/js/fuzzy';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FavoriteIngredient } from '$models/FavoriteIngredient';
import { Recipe } from '$models/Recipe';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { getBlsEntryByCode, getNutritionEntryByFdcId } from '$lib/server/nutritionMatcher';

type SearchResult = {
	source: 'bls' | 'usda' | 'recipe' | 'off';
	id: string;
	name: string;
	category: string;
	calories: number;
	favorited?: boolean;
	per100g?: any;
	portions?: any[];
	brands?: string;
	icon?: string;
	image?: string;
};

function lookupBls(blsCode: string, full: boolean): SearchResult | null {
	const entry = BLS_DB.find(e => e.blsCode === blsCode);
	if (!entry) return null;
	return {
		source: 'bls',
		id: entry.blsCode,
		name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
		category: entry.category,
		calories: entry.per100g.calories,
		...(full && { per100g: entry.per100g }),
	};
}

function lookupUsda(fdcId: string, full: boolean): SearchResult | null {
	const entry = NUTRITION_DB.find(e => String(e.fdcId) === fdcId);
	if (!entry) return null;
	return {
		source: 'usda',
		id: String(entry.fdcId),
		name: entry.name,
		category: entry.category,
		calories: entry.per100g.calories,
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

	const keys = [
		'calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
		'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
		'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
		'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
	];
	const totals: Record<string, number> = {};
	for (const k of keys) totals[k] = 0;
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
		for (const k of keys) totals[k] += factor * (per100g[k] ?? 0);
	}

	if (totalGrams <= 0) return null;

	const per100g: Record<string, number> = {};
	for (const k of keys) per100g[k] = totals[k] / totalGrams * 100;
	return { per100g, totalGrams };
}

/** GET: Search recipes, BLS, USDA, and OpenFoodFacts by fuzzy name match */
export const GET: RequestHandler = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') || '').toLowerCase().trim();
	if (q.length < 2) return json([]);

	const full = url.searchParams.get('full') === 'true';
	const wantFavorites = url.searchParams.get('favorites') === 'true';

	// Optionally load user favorites
	let favResults: SearchResult[] = [];
	let favKeys = new Set<string>();

	if (wantFavorites) {
		try {
			const user = await requireAuth(locals);
			await dbConnect();
			const favDocs = await FavoriteIngredient.find({ createdBy: user.nickname }).lean();

			// Batch-load favorited recipes
			const recipeFavIds = favDocs.filter(f => f.source === 'recipe').map(f => f.sourceId);
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
				const key = `${fav.source}:${fav.sourceId}`;
				let result: SearchResult | null = null;
				if (fav.source === 'bls') {
					result = lookupBls(fav.sourceId, full);
				} else if (fav.source === 'usda') {
					result = lookupUsda(fav.sourceId, full);
				} else if (fav.source === 'recipe') {
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
							...(full && nutrition && { per100g: nutrition.per100g }),
							...(image && { image }),
						};
					}
				}
				if (result) {
					result.favorited = true;
					favResults.push(result);
					favKeys.add(key);
				}
			}
		} catch {
			// Not authenticated or DB error — ignore, just return normal results
		}
	}

	const scored: (SearchResult & { score: number })[] = [];

	// Search recipes + OFF in parallel with BLS/USDA (which are in-memory)
	await dbConnect();
	const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const words = q.split(/\s+/).filter(Boolean);
	const nameRegex = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join('') + '.*';

	const [recipes, offResults] = await Promise.all([
		Recipe.find({
			$or: [
				{ name: { $regex: nameRegex, $options: 'i' } },
				{ short_name: { $regex: nameRegex, $options: 'i' } },
				{ tags: { $regex: escaped, $options: 'i' } },
			]
		}).select('name short_name icon images ingredients nutritionMappings portions').limit(10).lean()
			.catch(() => [] as any[]),
		OpenFoodFact.find(
			{ $text: { $search: q } },
			{ ...(full ? {} : { name: 1, nameDe: 1, brands: 1, category: 1, 'per100g.calories': 1, serving: 1 }), score: { $meta: 'textScore' } }
		).sort({ score: { $meta: 'textScore' } }).limit(15).lean()
			.catch(() => [] as any[]),
	]);

	// Process recipe results (highest priority — scored with bonus)
	for (const r of recipes as any[]) {
		const scoreName = fuzzyScore(q, (r.name || '').toLowerCase());
		const scoreShort = fuzzyScore(q, (r.short_name || '').replace(/_/g, ' ').toLowerCase());
		const best = Math.max(scoreName, scoreShort);
		if (best <= 0) continue;

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
			score: best + 100, // Boost recipes above BLS/USDA/OFF
			...(full && nutrition && { per100g: nutrition.per100g }),
			...(portions.length > 0 && { portions }),
			...(image && { image }),
			...((favKeys.has(`recipe:${recipeId}`) || favKeys.has(`recipe:${r.short_name}`)) && { favorited: true }),
		});
	}

	// Search BLS (in-memory, primary)
	for (const entry of BLS_DB) {
		const scoreDe = fuzzyScore(q, entry.nameDe.toLowerCase());
		const scoreEn = entry.nameEn ? fuzzyScore(q, entry.nameEn.toLowerCase()) : 0;
		const best = Math.max(scoreDe, scoreEn);
		if (best > 0) {
			scored.push({
				source: 'bls',
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				category: entry.category,
				calories: entry.per100g.calories,
				score: best,
				...(full && { per100g: entry.per100g }),
				...(favKeys.has(`bls:${entry.blsCode}`) && { favorited: true }),
			});
		}
	}

	// Search USDA
	for (const entry of NUTRITION_DB) {
		const s = fuzzyScore(q, entry.name.toLowerCase());
		if (s > 0) {
			scored.push({
				source: 'usda',
				id: String(entry.fdcId),
				name: entry.name,
				category: entry.category,
				calories: entry.per100g.calories,
				score: s,
				...(full && { per100g: entry.per100g, portions: entry.portions }),
				...(favKeys.has(`usda:${entry.fdcId}`) && { favorited: true }),
			});
		}
	}

	// Process OpenFoodFacts results
	{
		for (const entry of offResults as any[]) {
			const displayName = entry.nameDe || entry.name;
			// Use fuzzy score for ranking consistency with BLS/USDA
			const scoreDe = entry.nameDe ? fuzzyScore(q, entry.nameDe.toLowerCase()) : 0;
			const scoreEn = fuzzyScore(q, entry.name.toLowerCase());
			const scoreBrand = entry.brands ? fuzzyScore(q, entry.brands.toLowerCase()) : 0;
			const best = Math.max(scoreDe, scoreEn, scoreBrand, 1); // text search already filtered

			const portions: any[] = [];
			if (entry.serving?.grams) {
				portions.push(entry.serving);
			}

			scored.push({
				source: 'off',
				id: entry.barcode,
				name: displayName,
				category: entry.category || '',
				calories: entry.per100g?.calories ?? 0,
				brands: entry.brands,
				score: best,
				...(full && { per100g: entry.per100g }),
				...(portions.length > 0 && { portions }),
			});
		}
	}

	// Sort by score descending, return top 30 (without score field)
	scored.sort((a, b) => b.score - a.score);
	const searchResults = scored.slice(0, 30).map(({ score, ...rest }) => rest);

	// Prepend favorites, deduplicating
	if (favResults.length > 0) {
		const searchKeys = new Set(searchResults.map(r => `${r.source}:${r.id}`));
		const uniqueFavs = favResults.filter(f => !searchKeys.has(`${f.source}:${f.id}`));
		return json([...uniqueFavs, ...searchResults]);
	}

	return json(searchResults);
};
