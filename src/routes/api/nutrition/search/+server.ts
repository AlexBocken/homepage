import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';

/** GET: Search BLS + USDA nutrition databases by name substring */
export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') || '').toLowerCase().trim();
	if (q.length < 2) return json([]);

	const results: { source: 'bls' | 'usda'; id: string; name: string; category: string; calories: number }[] = [];

	// Search BLS first (primary)
	for (const entry of BLS_DB) {
		if (results.length >= 30) break;
		if (entry.nameDe.toLowerCase().includes(q) || entry.nameEn.toLowerCase().includes(q)) {
			results.push({
				source: 'bls',
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				category: entry.category,
				calories: entry.per100g.calories,
			});
		}
	}

	// Then USDA
	for (const entry of NUTRITION_DB) {
		if (results.length >= 40) break;
		if (entry.name.toLowerCase().includes(q)) {
			results.push({
				source: 'usda',
				id: String(entry.fdcId),
				name: entry.name,
				category: entry.category,
				calories: entry.per100g.calories,
			});
		}
	}

	return json(results.slice(0, 30));
};
