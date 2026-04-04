import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { fuzzyScore } from '$lib/js/fuzzy';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FavoriteIngredient } from '$models/FavoriteIngredient';

type SearchResult = { source: 'bls' | 'usda'; id: string; name: string; category: string; calories: number; favorited?: boolean; per100g?: any; portions?: any[] };

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

/** GET: Search BLS + USDA nutrition databases by fuzzy name match */
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

			for (const fav of favDocs) {
				const key = `${fav.source}:${fav.sourceId}`;
				const result = fav.source === 'bls'
					? lookupBls(fav.sourceId, full)
					: lookupUsda(fav.sourceId, full);
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

	// Search BLS (primary)
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
