import { BarcodeNutritionOverride } from '$models/BarcodeNutritionOverride';
import { BLS_DB } from '$lib/data/blsDb';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { usdaDisplayName } from '$lib/data/usdaNamesDe';

/**
 * Turning a barcode into a food goes through here, so the scanner, text search
 * and the food detail page all agree on what an overridden code resolves to.
 * See $models/BarcodeNutritionOverride for what an override means.
 */

export type OverrideTarget = { source: 'bls'; blsCode: string } | { source: 'usda'; fdcId: number };

/** The food payload clients already expect from /api/nutrition/barcode. */
export type ResolvedOverrideFood = {
	source: 'bls' | 'usda';
	id: string;
	name: string;
	nameDe: string | null;
	brands: string | null;
	category: string | null;
	nutriscore: null;
	calories: number;
	per100g: Record<string, number>;
	portions: { description: string; grams: number }[];
	/** The code that resolved here, so the UI can offer to unlink it. */
	overriddenBarcode: string;
};

/**
 * Build the food payload for a mapping target. The BLS/USDA entry is shown as
 * itself — its own name and its own portions (BLS carries none) — rather than
 * keeping OFF's branding, so what you see is exactly the record being used.
 *
 * Returns null when the mapping points at an entry that no longer exists, e.g.
 * after a USDA re-import dropped an fdcId. Callers then fall back to OFF.
 */
export function buildOverrideFood(
	target: OverrideTarget,
	barcode: string
): ResolvedOverrideFood | null {
	if (target.source === 'bls') {
		const entry = BLS_DB.find((e) => e.blsCode === target.blsCode);
		if (!entry) return null;
		return {
			source: 'bls',
			id: entry.blsCode,
			// Matches how search labels BLS hits: German name, English in parens.
			name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
			nameDe: entry.nameDe,
			brands: null,
			category: entry.category ?? null,
			nutriscore: null,
			calories: entry.per100g.calories,
			per100g: entry.per100g as unknown as Record<string, number>,
			portions: [],
			overriddenBarcode: barcode
		};
	}

	const entry = NUTRITION_DB.find((e) => e.fdcId === target.fdcId);
	if (!entry) return null;
	return {
		source: 'usda',
		id: String(entry.fdcId),
		name: usdaDisplayName(entry.name),
		nameDe: null,
		brands: null,
		category: entry.category ?? null,
		nutriscore: null,
		calories: entry.per100g.calories,
		per100g: entry.per100g as unknown as Record<string, number>,
		portions: entry.portions ?? [],
		overriddenBarcode: barcode
	};
}

function toTarget(doc: {
	source: string;
	blsCode?: string | null;
	fdcId?: number | null;
}): OverrideTarget | null {
	if (doc.source === 'bls' && doc.blsCode) return { source: 'bls', blsCode: doc.blsCode };
	if (doc.source === 'usda' && typeof doc.fdcId === 'number') {
		return { source: 'usda', fdcId: doc.fdcId };
	}
	return null;
}

/** Caller must have run dbConnect(). Returns null when the code isn't mapped. */
export async function resolveBarcodeOverride(barcode: string): Promise<ResolvedOverrideFood | null> {
	const doc = await BarcodeNutritionOverride.findOne({ barcode }).lean<{
		source: string;
		blsCode?: string;
		fdcId?: number;
	}>();
	if (!doc) return null;
	const target = toTarget(doc);
	if (!target) return null;
	return buildOverrideFood(target, barcode);
}

/**
 * Batch form for search, which has a page of OFF hits to check at once. Codes
 * with no mapping are absent from the map.
 */
export async function resolveBarcodeOverrides(
	barcodes: string[]
): Promise<Map<string, ResolvedOverrideFood>> {
	const out = new Map<string, ResolvedOverrideFood>();
	if (barcodes.length === 0) return out;
	const docs = await BarcodeNutritionOverride.find({ barcode: { $in: barcodes } }).lean<
		{ barcode: string; source: string; blsCode?: string; fdcId?: number }[]
	>();
	for (const doc of docs) {
		const target = toTarget(doc);
		if (!target) continue;
		const food = buildOverrideFood(target, doc.barcode);
		if (food) out.set(doc.barcode, food);
	}
	return out;
}

/** Validates a mapping target against the actual databases before it is stored. */
export function validateTarget(
	source: unknown,
	blsCode: unknown,
	fdcId: unknown
): { ok: true; target: OverrideTarget; name: string } | { ok: false; error: string } {
	if (source === 'bls') {
		if (typeof blsCode !== 'string' || !blsCode) return { ok: false, error: 'blsCode is required' };
		const entry = BLS_DB.find((e) => e.blsCode === blsCode);
		if (!entry) return { ok: false, error: `Unknown BLS code ${blsCode}` };
		return { ok: true, target: { source: 'bls', blsCode }, name: entry.nameDe };
	}
	if (source === 'usda') {
		const id = Number(fdcId);
		if (!Number.isFinite(id)) return { ok: false, error: 'fdcId is required' };
		const entry = NUTRITION_DB.find((e) => e.fdcId === id);
		if (!entry) return { ok: false, error: `Unknown USDA fdcId ${id}` };
		return { ok: true, target: { source: 'usda', fdcId: id }, name: usdaDisplayName(entry.name) };
	}
	return { ok: false, error: "source must be 'bls' or 'usda'" };
}
