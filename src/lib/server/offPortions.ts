import type { Portion } from '$lib/fitness/portions';

/** The OpenFoodFacts fields a portion list is derived from. */
export type OffPortionSource = {
	nameDe?: string | null;
	serving?: { description?: string | null; grams?: number | null } | null;
	productQuantityG?: number | null;
};

/**
 * Build the portion list for an OpenFoodFacts product: the manufacturer's serving
 * ("30 g", "1 biscuit") plus the whole package from `product_quantity`.
 *
 * Single source of truth for all four OFF read paths (barcode scan, text search,
 * lookup, food-detail page). They previously each rebuilt this inline and drifted:
 * only the barcode path emitted the package portion, so the same product offered
 * two portions when scanned and one when searched.
 *
 * The German/English package label keys off `nameDe` — matching the language the
 * product's own name is stored in, since server endpoints have no request locale.
 *
 * Mongo projections feeding this MUST select `serving`, `productQuantityG` and
 * `nameDe`, or portions silently vanish.
 */
export function offPortions(doc: OffPortionSource): Portion[] {
	const portions: Portion[] = [];

	const servingG = Number(doc.serving?.grams);
	const servingDesc = doc.serving?.description?.trim();
	if (servingG > 0 && servingDesc) {
		portions.push({ description: servingDesc, grams: servingG });
	}

	const pq = Number(doc.productQuantityG);
	if (pq > 0) {
		const label = doc.nameDe ? `1 Packung (${Math.round(pq)}g)` : `1 package (${Math.round(pq)}g)`;
		// A single-serving product lists the same weight twice — keep just the serving.
		if (!portions.some(p => Math.abs(p.grams - pq) < 0.5)) {
			portions.push({ description: label, grams: pq });
		}
	}

	return portions;
}
