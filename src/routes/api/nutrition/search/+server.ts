import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { fuzzyScore } from '$lib/js/fuzzy';

/** GET: Search BLS + USDA nutrition databases by fuzzy name match */
export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') || '').toLowerCase().trim();
	if (q.length < 2) return json([]);

	const scored: { source: 'bls' | 'usda'; id: string; name: string; category: string; calories: number; score: number }[] = [];

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
			});
		}
	}

	// Sort by score descending, return top 30 (without score field)
	scored.sort((a, b) => b.score - a.score);
	return json(scored.slice(0, 30).map(({ score, ...rest }) => rest));
};
