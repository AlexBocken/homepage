import { describe, it, expect } from 'vitest';
import {
	portionMultiplier,
	formatAmountLabel,
	coercePortion,
	coercePortions,
	portionOptionLabel,
} from '$lib/fitness/portions';
import { offPortions } from '$lib/server/offPortions';

const PACK = { description: '1 Packung (250g)', grams: 250 };

describe('portionMultiplier', () => {
	it('states grams as a count of the portion', () => {
		expect(portionMultiplier(500, PACK)).toBe(2);
		expect(portionMultiplier(125, PACK)).toBe(0.5);
	});

	it('rounds to one decimal', () => {
		expect(portionMultiplier(260, PACK)).toBe(1);
		expect(portionMultiplier(290, PACK)).toBe(1.2);
	});

	it('returns null when there is no usable basis', () => {
		expect(portionMultiplier(100, undefined)).toBeNull();
		expect(portionMultiplier(100, null)).toBeNull();
		// A zero-gram portion would divide by zero into Infinity.
		expect(portionMultiplier(100, { description: 'bad', grams: 0 })).toBeNull();
	});
});

describe('formatAmountLabel', () => {
	it('shows the portion count alongside the real gram amount', () => {
		expect(formatAmountLabel(500, PACK)).toBe('2 × 1 Packung (250g) · 500 g');
	});

	it('keeps fractional counts to one decimal', () => {
		expect(formatAmountLabel(125, PACK)).toBe('0.5 × 1 Packung (250g) · 125 g');
	});

	it('falls back to plain grams with no portion', () => {
		expect(formatAmountLabel(75, undefined)).toBe('75 g');
	});

	it('falls back to plain grams when the portion is unusable', () => {
		expect(formatAmountLabel(75, { description: 'bad', grams: 0 })).toBe('75 g');
	});

	it('can omit the gram suffix', () => {
		expect(formatAmountLabel(500, PACK, { withGrams: false })).toBe('2 × 1 Packung (250g)');
	});
});

describe('coercePortion', () => {
	it('accepts a well-formed portion', () => {
		expect(coercePortion({ description: '1 slice', grams: 30 })).toEqual({ description: '1 slice', grams: 30 });
	});

	it('rejects amounts that would corrupt the display multiplier', () => {
		expect(coercePortion({ description: 'x', grams: 0 })).toBeNull();
		expect(coercePortion({ description: 'x', grams: -5 })).toBeNull();
		expect(coercePortion({ description: 'x', grams: Infinity })).toBeNull();
		expect(coercePortion({ description: 'x', grams: '30' })).toBeNull();
	});

	it('rejects missing or empty descriptions', () => {
		expect(coercePortion({ grams: 30 })).toBeNull();
		expect(coercePortion({ description: '   ', grams: 30 })).toBeNull();
	});

	it('rejects non-objects', () => {
		expect(coercePortion(null)).toBeNull();
		expect(coercePortion('1 slice')).toBeNull();
	});

	it('trims and caps the description', () => {
		expect(coercePortion({ description: '  1 slice  ', grams: 30 })?.description).toBe('1 slice');
		expect(coercePortion({ description: 'x'.repeat(500), grams: 30 })?.description).toHaveLength(120);
	});
});

describe('coercePortions', () => {
	it('drops invalid entries but keeps the good ones', () => {
		expect(coercePortions([PACK, { description: 'bad', grams: 0 }, null])).toEqual([PACK]);
	});

	it('returns undefined for a non-array or an all-invalid list', () => {
		expect(coercePortions(undefined)).toBeUndefined();
		expect(coercePortions('nope')).toBeUndefined();
		expect(coercePortions([{ description: 'bad', grams: -1 }])).toBeUndefined();
	});

	it('caps the list length', () => {
		expect(coercePortions(Array(50).fill(PACK))).toHaveLength(20);
	});
});

describe('portionOptionLabel', () => {
	it('rounds fractional package weights', () => {
		expect(portionOptionLabel({ description: '1 serving', grams: 32.7 })).toBe('1 serving (33g)');
	});
});

describe('offPortions', () => {
	it('emits both the serving and the package', () => {
		expect(offPortions({
			nameDe: 'Kekse',
			serving: { description: '30 g', grams: 30 },
			productQuantityG: 250,
		})).toEqual([
			{ description: '30 g', grams: 30 },
			{ description: '1 Packung (250g)', grams: 250 },
		]);
	});

	it('emits the package even when no serving is known — the search/barcode parity bug', () => {
		expect(offPortions({ nameDe: null, serving: null, productQuantityG: 500 })).toEqual([
			{ description: '1 package (500g)', grams: 500 },
		]);
	});

	it('labels the package in the language the product name is stored in', () => {
		expect(offPortions({ nameDe: 'Kekse', productQuantityG: 100 })[0].description).toBe('1 Packung (100g)');
		expect(offPortions({ productQuantityG: 100 })[0].description).toBe('1 package (100g)');
	});

	it('does not list a single-serving product twice', () => {
		expect(offPortions({
			serving: { description: '330 ml', grams: 330 },
			productQuantityG: 330,
		})).toEqual([{ description: '330 ml', grams: 330 }]);
	});

	it('ignores unusable serving and package data', () => {
		expect(offPortions({ serving: { description: '', grams: 30 }, productQuantityG: 0 })).toEqual([]);
		expect(offPortions({ serving: { description: '30 g', grams: 0 } })).toEqual([]);
		expect(offPortions({})).toEqual([]);
	});
});
