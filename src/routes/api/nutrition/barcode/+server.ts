import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { OpenFoodFact } from '$models/OpenFoodFact';

const NUTRIENT_MAP: Record<string, string> = {
	'energy-kcal_100g': 'calories',
	'proteins_100g': 'protein',
	'fat_100g': 'fat',
	'saturated-fat_100g': 'saturatedFat',
	'carbohydrates_100g': 'carbs',
	'fiber_100g': 'fiber',
	'sugars_100g': 'sugars',
	'calcium_100g': 'calcium',
	'iron_100g': 'iron',
	'magnesium_100g': 'magnesium',
	'phosphorus_100g': 'phosphorus',
	'potassium_100g': 'potassium',
	'sodium_100g': 'sodium',
	'zinc_100g': 'zinc',
	'vitamin-a_100g': 'vitaminA',
	'vitamin-c_100g': 'vitaminC',
	'vitamin-d_100g': 'vitaminD',
	'vitamin-e_100g': 'vitaminE',
	'vitamin-k_100g': 'vitaminK',
	'vitamin-b1_100g': 'thiamin',
	'vitamin-b2_100g': 'riboflavin',
	'vitamin-pp_100g': 'niacin',
	'vitamin-b6_100g': 'vitaminB6',
	'vitamin-b12_100g': 'vitaminB12',
	'folates_100g': 'folate',
	'cholesterol_100g': 'cholesterol',
};

function extractPer100g(nutriments: any): Record<string, number> | null {
	if (!nutriments) return null;
	const out: Record<string, number> = {};
	let hasAny = false;
	for (const [offKey, ourKey] of Object.entries(NUTRIENT_MAP)) {
		const v = Number(nutriments[offKey]);
		if (!isNaN(v) && v >= 0) {
			out[ourKey] = v;
			if (ourKey === 'calories' || ourKey === 'protein' || ourKey === 'fat' || ourKey === 'carbs') {
				hasAny = true;
			}
		}
	}
	if (!out.calories) {
		const kj = Number(nutriments['energy_100g']);
		if (!isNaN(kj) && kj > 0) {
			out.calories = Math.round(kj / 4.184 * 10) / 10;
			hasAny = true;
		}
	}
	return hasAny ? out : null;
}

async function fetchFromOffApi(code: string) {
	const res = await fetch(
		`https://world.openfoodfacts.org/api/v2/product/${code}?fields=code,product_name,product_name_en,product_name_de,product_name_fr,brands,quantity,serving_size,serving_quantity,nutriments,nutriscore_grade,categories_tags,product_quantity`
	);
	if (!res.ok) return null;
	const data = await res.json();
	if (data.status !== 1 || !data.product) return null;

	const p = data.product;
	const per100g = extractPer100g(p.nutriments);
	if (!per100g) return null;

	const en = p.product_name_en?.trim();
	const de = p.product_name_de?.trim();
	const generic = p.product_name?.trim();
	const fr = p.product_name_fr?.trim();
	const name = en || generic || fr;
	if (!name) return null;

	const portions: { description: string; grams: number }[] = [];
	const servingG = Number(p.serving_quantity);
	const servingDesc = typeof p.serving_size === 'string' ? p.serving_size.trim() : '';
	if (servingG > 0 && servingDesc) {
		portions.push({ description: servingDesc, grams: servingG });
	}
	const pq = Number(p.product_quantity);
	if (pq > 0) {
		const label = de ? `1 Packung (${pq}g)` : `1 package (${pq}g)`;
		portions.push({ description: label, grams: pq });
	}

	let nutriscore: string | null = null;
	if (typeof p.nutriscore_grade === 'string' && /^[a-e]$/.test(p.nutriscore_grade)) {
		nutriscore = p.nutriscore_grade;
	}

	let category: string | null = null;
	if (Array.isArray(p.categories_tags) && p.categories_tags.length > 0) {
		category = String(p.categories_tags[p.categories_tags.length - 1])
			.replace(/^en:/, '').replace(/-/g, ' ');
	}

	const brands = typeof p.brands === 'string' ? p.brands.trim() : null;

	return {
		source: 'off' as const,
		id: String(p.code),
		name,
		nameDe: de && de !== name ? de : null,
		brands: brands || null,
		category,
		nutriscore,
		calories: per100g.calories,
		per100g,
		portions,
		serving: servingG > 0 && servingDesc ? { description: servingDesc, grams: servingG } : null,
		productQuantityG: pq > 0 ? pq : null,
	};
}

/** GET /api/nutrition/barcode?code=3017620422003 */
export const GET: RequestHandler = async ({ url }) => {
	const code = (url.searchParams.get('code') || '').trim();
	if (!code || code.length < 4) {
		return json({ error: 'Invalid barcode' }, { status: 400 });
	}

	await dbConnect();
	const doc = await OpenFoodFact.findOne({ barcode: code }).lean();

	if (doc) {
		const portions = [];
		if (doc.serving && doc.serving.grams > 0) {
			portions.push({ description: doc.serving.description, grams: doc.serving.grams });
		}
		if (doc.productQuantityG && doc.productQuantityG > 0) {
			const label = doc.nameDe ? `1 Packung (${doc.productQuantityG}g)` : `1 package (${doc.productQuantityG}g)`;
			portions.push({ description: label, grams: doc.productQuantityG });
		}

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
			portions,
		});
	}

	// Fallback: query OFF live API
	const live = await fetchFromOffApi(code);
	if (!live) return json({ error: 'Product not found' }, { status: 404 });

	// Cache in local DB for future lookups
	try {
		await OpenFoodFact.updateOne(
			{ barcode: live.id },
			{ $setOnInsert: {
				barcode: live.id,
				name: live.name,
				...(live.nameDe ? { nameDe: live.nameDe } : {}),
				...(live.brands ? { brands: live.brands } : {}),
				...(live.category ? { category: live.category } : {}),
				...(live.nutriscore ? { nutriscore: live.nutriscore } : {}),
				per100g: live.per100g,
				...(live.serving ? { serving: live.serving } : {}),
				...(live.productQuantityG ? { productQuantityG: live.productQuantityG } : {}),
			}},
			{ upsert: true },
		);
	} catch {
		// non-critical — don't fail the response
	}

	return json(live);
};
