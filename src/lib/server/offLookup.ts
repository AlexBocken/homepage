import { OpenFoodFact } from '$models/OpenFoodFact';
import { offPortions } from '$lib/server/offPortions';
import type { Portion } from '$lib/fitness/portions';

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

export type OffProduct = {
	source: 'off';
	id: string;
	name: string;
	nameDe: string | null;
	brands: string | null;
	category: string | null;
	nutriscore: string | null;
	calories: number;
	per100g: Record<string, number>;
	portions: Portion[];
	serving: { description: string; grams: number } | null;
	productQuantityG: number | null;
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

/** Query the live OpenFoodFacts API for a barcode. Returns null when OFF has no
 *  usable record (unknown code, or a record with no nutrition data at all). */
export async function fetchFromOffApi(code: string): Promise<OffProduct | null> {
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
	// `de` is in the fallback chain: plenty of Swiss/German products carry only a
	// German name, and without it they were rejected as nameless and 404'd.
	const name = en || generic || de || fr;
	if (!name) return null;

	const servingG = Number(p.serving_quantity);
	const servingDesc = typeof p.serving_size === 'string' ? p.serving_size.trim() : '';
	const pq = Number(p.product_quantity);
	const serving = servingG > 0 && servingDesc ? { description: servingDesc, grams: servingG } : null;
	const portions = offPortions({ nameDe: de, serving, productQuantityG: pq > 0 ? pq : null });

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
		source: 'off',
		id: String(p.code),
		name,
		nameDe: de && de !== name ? de : null,
		brands: brands || null,
		category,
		nutriscore,
		calories: per100g.calories,
		per100g,
		portions,
		serving,
		productQuantityG: pq > 0 ? pq : null,
	};
}

/** Cache a live OFF result locally so later reads hit Mongo instead of the network.
 *
 *  Written under every code it can legitimately be looked up by: OFF normalises
 *  barcodes (a scanned 12-digit UPC-A comes back as a zero-padded EAN-13), so
 *  caching only under `product.id` leaves the code the scanner actually produced
 *  missing from the cache — every scan of that product would re-hit the network.
 *
 *  Never throws: caching is an optimisation, and a failed write must not take the
 *  response down with it. */
export async function cacheOffProduct(product: OffProduct, ...alsoUnder: string[]) {
	const codes = [...new Set([product.id, ...alsoUnder].filter(Boolean))];
	for (const barcode of codes) {
		try {
			await OpenFoodFact.updateOne(
				{ barcode },
				{ $setOnInsert: {
					barcode,
					name: product.name,
					...(product.nameDe ? { nameDe: product.nameDe } : {}),
					...(product.brands ? { brands: product.brands } : {}),
					...(product.category ? { category: product.category } : {}),
					...(product.nutriscore ? { nutriscore: product.nutriscore } : {}),
					per100g: product.per100g,
					...(product.serving ? { serving: product.serving } : {}),
					...(product.productQuantityG ? { productQuantityG: product.productQuantityG } : {}),
				}},
				{ upsert: true },
			);
		} catch {
			// non-critical — don't fail the response
		}
	}
}
