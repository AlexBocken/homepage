import { describe, it, expect } from 'vitest';
import {
	nutrientContributions, expandCustomMeals, per100gValue, nutrientMeta, isKnownNutrient,
	parseSortBy,
} from '../../../src/lib/fitness/nutrientContributions';

describe('nutrientMeta', () => {
	it('resolves micronutrients, amino acids and fatty acids alike', () => {
		expect(nutrientMeta('vitaminA')?.unit).toBe('mcg');
		expect(nutrientMeta('leucine')?.unit).toBe('g');
		expect(nutrientMeta('dha')?.label).toBe('DHA');
	});

	it('rejects keys that are not nutrients', () => {
		expect(nutrientMeta('name')).toBeNull();
		expect(isKnownNutrient('__proto__')).toBe(false);
	});
});

describe('per100gValue', () => {
	it('reads a stored key', () => {
		expect(per100gValue({ vitaminA: 120 }, 'vitaminA')).toBe(120);
	});

	it('derives omega totals per record rather than reading a stored one', () => {
		expect(per100gValue({ alphaLinolenicAcid: 1, dha: 0.5, omega3: 99 }, 'omega3')).toBeCloseTo(1.5);
	});

	it('reports an absent key as unknown, not zero', () => {
		expect(per100gValue({ protein: 10 }, 'vitaminA')).toBeNull();
	});
});

describe('parseSortBy', () => {
	it('defaults to amount and keeps the old per-gram links working', () => {
		expect(parseSortBy(null)).toBe('amount');
		expect(parseSortBy('nonsense')).toBe('amount');
		expect(parseSortBy('per100kcal')).toBe('per100kcal');
		expect(parseSortBy('per100g')).toBe('per100kcal');
	});
});

describe('nutrientContributions', () => {
	const entries = [
		{ name: 'Liver', source: 'bls', sourceId: 'U1', amountGrams: 50, per100g: { calories: 130, vitaminA: 9000 } },
		{ name: 'Carrot', source: 'bls', sourceId: 'G1', amountGrams: 200, per100g: { calories: 40, vitaminA: 830 } },
		{ name: 'Bread', source: 'bls', sourceId: 'B1', amountGrams: 100, per100g: { calories: 250, protein: 8 } },
	];

	it('ranks by amount contributed by default', () => {
		const { rows, total } = nutrientContributions(entries, 'vitaminA');
		expect(rows.map(r => r.name)).toEqual(['Liver', 'Carrot']);
		expect(rows[0].amount).toBeCloseTo(4500);
		expect(rows[1].amount).toBeCloseTo(1660);
		expect(total).toBeCloseTo(6160);
	});

	it('ranks by nutrient per 100 kcal when asked, independent of how much was eaten', () => {
		const { rows } = nutrientContributions(entries, 'vitaminA', 'per100kcal');
		expect(rows.map(r => r.name)).toEqual(['Liver', 'Carrot']);
		// 9000 mcg per 100 g at 130 kcal per 100 g.
		expect(rows[0].per100kcal).toBeCloseTo((9000 / 130) * 100);
		expect(rows[1].per100kcal).toBeCloseTo((830 / 40) * 100);
	});

	// Ordering by density must be able to disagree with ordering by amount,
	// otherwise the toggle is decorative.
	it('the two orderings can disagree', () => {
		const e = [
			{ name: 'Liver', source: 'bls', sourceId: 'U1', amountGrams: 20, per100g: { calories: 130, vitaminA: 9000 } },
			{ name: 'Carrot', source: 'bls', sourceId: 'G1', amountGrams: 300, per100g: { calories: 40, vitaminA: 830 } },
		];
		expect(nutrientContributions(e, 'vitaminA').rows[0].name).toBe('Carrot');
		expect(nutrientContributions(e, 'vitaminA', 'per100kcal').rows[0].name).toBe('Liver');
	});

	// Per gram, a dried herb beats everything; per calorie it does not. Ranking by
	// energy is the whole point of the change, so it is worth pinning down.
	it('ranks per calorie rather than per gram', () => {
		const e = [
			{ name: 'Parsley', source: 'bls', sourceId: 'R1', amountGrams: 2, per100g: { calories: 292, vitaminK: 1640 } },
			{ name: 'Spinach', source: 'bls', sourceId: 'G2', amountGrams: 200, per100g: { calories: 23, vitaminK: 483 } },
		];
		const { rows } = nutrientContributions(e, 'vitaminK', 'per100kcal');
		expect(rows[0].name).toBe('Spinach');
		// Parsley is still the richer of the two by weight.
		expect(rows[1].per100g).toBeGreaterThan(rows[0].per100g);
	});

	it('ranks a food that publishes no calories last rather than as if it were empty', () => {
		const e = [
			{ name: 'Unlabelled', source: 'bls', sourceId: 'N1', amountGrams: 100, per100g: { vitaminC: 500 } },
			{ name: 'Pepper', source: 'bls', sourceId: 'P1', amountGrams: 100, per100g: { calories: 31, vitaminC: 128 } },
		];
		const { rows } = nutrientContributions(e, 'vitaminC', 'per100kcal');
		expect(rows.map(r => r.name)).toEqual(['Pepper', 'Unlabelled']);
		expect(rows[1].per100kcal).toBeNull();
	});

	// A zero-calorie figure is an energy-free food, not a divisor: dividing by it
	// would rank a diet drink above every food that exists.
	it('treats a zero-calorie figure as no density rather than an infinite one', () => {
		const e = [
			{ name: 'Diet Drink', source: 'off', sourceId: 'D1', amountGrams: 500, per100g: { calories: 0, sodium: 10 } },
			{ name: 'Bread', source: 'bls', sourceId: 'B1', amountGrams: 100, per100g: { calories: 250, sodium: 500 } },
		];
		const { rows } = nutrientContributions(e, 'sodium', 'per100kcal');
		expect(rows[0].name).toBe('Bread');
		expect(rows[1].per100kcal).toBeNull();
	});

	it('sums energy across folded entries of the same food', () => {
		const e = [
			{ name: 'Milk', source: 'bls', sourceId: 'M1', amountGrams: 200, per100g: { calories: 64, calcium: 120 } },
			{ name: 'Milk', source: 'bls', sourceId: 'M1', amountGrams: 100, per100g: { calories: 64, calcium: 120 } },
		];
		const { rows } = nutrientContributions(e, 'calcium', 'per100kcal');
		expect(rows[0].kcal).toBeCloseTo(192);
		expect(rows[0].per100kcal).toBeCloseTo((120 / 64) * 100);
	});

	it('separates foods that report no figure instead of ranking them last at zero', () => {
		const { rows, unreported, coverage } = nutrientContributions(entries, 'vitaminA');
		expect(rows.some(r => r.name === 'Bread')).toBe(false);
		expect(unreported.map(u => u.name)).toEqual(['Bread']);
		expect(coverage).toBeCloseTo(250 / 350);
	});

	it('folds repeat entries of the same food into one row', () => {
		const e = [
			{ name: 'Milk', source: 'bls', sourceId: 'M1', amountGrams: 200, per100g: { calcium: 120 } },
			{ name: 'Milk', source: 'bls', sourceId: 'M1', amountGrams: 100, per100g: { calcium: 120 } },
		];
		const { rows } = nutrientContributions(e, 'calcium');
		expect(rows).toHaveLength(1);
		expect(rows[0].entries).toBe(2);
		expect(rows[0].grams).toBe(300);
		expect(rows[0].amount).toBeCloseTo(360);
		expect(rows[0].per100g).toBeCloseTo(120);
	});

	it('reports each row\'s share of the total', () => {
		const { rows } = nutrientContributions(entries, 'vitaminA');
		expect(rows[0].share + rows[1].share).toBeCloseTo(1);
	});

	it('ignores entries with no weight', () => {
		const { rows, total } = nutrientContributions(
			[{ name: 'X', source: 'bls', sourceId: 'X', amountGrams: 0, per100g: { iron: 5 } }], 'iron');
		expect(rows).toHaveLength(0);
		expect(total).toBe(0);
	});
});

describe('expandCustomMeals', () => {
	const meal = {
		_id: 'meal1',
		name: 'Chili',
		ingredients: [
			{ name: 'Beef', source: 'bls', sourceId: 'U9', amountGrams: 300, per100g: { iron: 2.6 } },
			{ name: 'Beans', source: 'bls', sourceId: 'H9', amountGrams: 100, per100g: { iron: 2.0 } },
		],
	};

	it('splits a logged meal into its ingredients, scaled to the portion eaten', () => {
		// Half the meal's 400 g, so half of every ingredient.
		const out = expandCustomMeals(
			[{ name: 'Chili', source: 'custom', sourceId: 'meal1', amountGrams: 200 }], [meal]);
		expect(out).toHaveLength(2);
		expect(out[0]).toMatchObject({ name: 'Beef', amountGrams: 150, via: 'Chili' });
		expect(out[1]).toMatchObject({ name: 'Beans', amountGrams: 50, via: 'Chili' });
	});

	it('produces ingredient rows tagged with the meal they came from', () => {
		const out = expandCustomMeals(
			[{ name: 'Chili', source: 'custom', sourceId: 'meal1', amountGrams: 400 }], [meal]);
		const { rows } = nutrientContributions(out, 'iron');
		expect(rows.map(r => [r.name, r.via])).toEqual([['Beef', 'Chili'], ['Beans', 'Chili']]);
		expect(rows[0].amount).toBeCloseTo(7.8);
	});

	// A deleted meal must not silently drop the entry — that would understate the day.
	it('passes through a meal it cannot resolve', () => {
		const out = expandCustomMeals(
			[{ name: 'Gone', source: 'custom', sourceId: 'missing', amountGrams: 100, per100g: { iron: 1 } }], [meal]);
		expect(out).toHaveLength(1);
		expect(out[0].name).toBe('Gone');
	});

	it('passes through a meal with no recorded weight', () => {
		const empty = { _id: 'm2', name: 'Empty', ingredients: [{ name: 'X', amountGrams: 0 }] };
		const out = expandCustomMeals(
			[{ name: 'Empty', source: 'custom', sourceId: 'm2', amountGrams: 50, per100g: { iron: 1 } }], [empty]);
		expect(out).toHaveLength(1);
		expect(out[0].name).toBe('Empty');
	});

	it('leaves non-custom entries untouched', () => {
		const e = [{ name: 'Apple', source: 'bls', sourceId: 'F1', amountGrams: 100 }];
		expect(expandCustomMeals(e, [meal])).toEqual(e);
	});

	// Same ingredient via two meals must stay distinct, or a row names one meal while
	// counting another's grams.
	// The page keys its {#each} on these fields. If two rows agree on all of them
	// Svelte throws a duplicate-key error during hydration and blanks the page, so
	// the identity used for rendering has to stay unique — `via` included.
	it('produces rows whose (source, sourceId, via, name) identity is unique', () => {
		const meal2 = {
			_id: 'meal2', name: 'Stew',
			ingredients: [{ name: 'Beef', source: 'bls', sourceId: 'U9', amountGrams: 100, per100g: { iron: 2.6 } }],
		};
		const out = expandCustomMeals([
			{ name: 'Chili', source: 'custom', sourceId: 'meal1', amountGrams: 400 },
			{ name: 'Stew', source: 'custom', sourceId: 'meal2', amountGrams: 100 },
			{ name: 'Beef', source: 'bls', sourceId: 'U9', amountGrams: 50, per100g: { iron: 2.6 } },
		], [meal, meal2]);
		const { rows } = nutrientContributions(out, 'iron');
		const keys = rows.map(r => `${r.source}:${r.sourceId}:${r.via ?? ''}:${r.name}`);
		expect(new Set(keys).size).toBe(keys.length);
		// Beef three ways: via Chili, via Stew, and eaten on its own.
		expect(rows.filter(r => r.name === 'Beef')).toHaveLength(3);
	});

	it('keeps the same ingredient separate per meal', () => {
		const meal2 = {
			_id: 'meal2', name: 'Stew',
			ingredients: [{ name: 'Beef', source: 'bls', sourceId: 'U9', amountGrams: 100, per100g: { iron: 2.6 } }],
		};
		const out = expandCustomMeals([
			{ name: 'Chili', source: 'custom', sourceId: 'meal1', amountGrams: 400 },
			{ name: 'Stew', source: 'custom', sourceId: 'meal2', amountGrams: 100 },
		], [meal, meal2]);
		const { rows } = nutrientContributions(out, 'iron');
		const beef = rows.filter(r => r.name === 'Beef');
		expect(beef).toHaveLength(2);
		expect(beef.map(r => r.via).sort()).toEqual(['Chili', 'Stew']);
	});
});
