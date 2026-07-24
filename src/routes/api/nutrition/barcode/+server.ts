import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { offPortions } from '$lib/server/offPortions';
import { fetchFromOffApi, cacheOffProduct } from '$lib/server/offLookup';
import { offPer100gToAppUnits } from '$lib/fitness/offUnits';

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
			// Stored in OFF's grams-for-everything convention; converted on read.
			per100g: offPer100gToAppUnits(doc.per100g as Record<string, number>),
			portions: offPortions(doc),
		});
	}

	// Fallback: query OFF live API
	const live = await fetchFromOffApi(code);
	if (!live) return json({ error: 'Product not found' }, { status: 404 });

	// Cache under both OFF's canonical code and the code that was scanned.
	await cacheOffProduct(live, code);

	// `per100gRaw` exists only so the cache write above can keep OFF's units — it is
	// not part of what a client consumes.
	const { per100gRaw: _raw, ...response } = live;
	return json(response);
};
