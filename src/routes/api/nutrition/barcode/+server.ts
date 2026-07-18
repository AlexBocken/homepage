import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { offPortions } from '$lib/server/offPortions';
import { fetchFromOffApi, cacheOffProduct } from '$lib/server/offLookup';

/** GET /api/nutrition/barcode?code=3017620422003 */
export const GET: RequestHandler = async ({ url }) => {
	const code = (url.searchParams.get('code') || '').trim();
	if (!code || code.length < 4) {
		return json({ error: 'Invalid barcode' }, { status: 400 });
	}

	await dbConnect();
	const doc = await OpenFoodFact.findOne({ barcode: code }).lean();

	if (doc) {
		return json({
			source: 'off',
			id: doc.barcode,
			name: doc.name,
			nameDe: doc.nameDe ?? null,
			brands: doc.brands ?? null,
			category: doc.category ?? null,
			nutriscore: doc.nutriscore ?? null,
			calories: doc.per100g.calories,
			per100g: doc.per100g,
			portions: offPortions(doc),
		});
	}

	// Fallback: query OFF live API
	const live = await fetchFromOffApi(code);
	if (!live) return json({ error: 'Product not found' }, { status: 404 });

	// Cache under both OFF's canonical code and the code that was scanned.
	await cacheOffProduct(live, code);

	return json(live);
};
