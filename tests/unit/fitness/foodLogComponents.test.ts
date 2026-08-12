import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	foodLeaf, mealLeaves, recipeLeaves, blendPer100g, flattenComponents,
} from '../../../src/lib/server/foodLogComponents';

/** Recipes the reference resolver is allowed to find, keyed by slug. Filled per
 *  test; the mock below answers the one `$or` query loadReferencedRecipes makes. */
const recipeStore = new Map<string, any>();

vi.mock('$models/Recipe', () => ({
	Recipe: {
		find: (query: any) => ({
			select: () => ({
				lean: async () => {
					const or: any[] = query?.$or ?? [];
					const slugs: string[] = or.flatMap((c) => c.short_name?.$in ?? []);
					const ids: string[] = or.flatMap((c) => c._id?.$in ?? []).map(String);
					return [...recipeStore.values()].filter(
						(d) => slugs.includes(d.short_name) || ids.includes(String(d._id)),
					);
				},
			}),
		}),
	},
}));

describe('foodLeaf', () => {
	it('is a single leaf carrying the amount and frozen portions', () => {
		const portions = [{ description: '1 medium', grams: 120 }];
		const [leaf, ...rest] = foodLeaf(
			{ source: 'usda', sourceId: '167512', portions, selectedPortion: portions[0] },
			240,
		);
		expect(rest).toHaveLength(0);
		expect(leaf).toMatchObject({ source: 'usda', sourceId: '167512', amountGrams: 240 });
		expect(leaf.portions).toBe(portions);
		expect(leaf.selectedPortion).toEqual({ description: '1 medium', grams: 120 });
	});
});

describe('mealLeaves', () => {
	const meal = {
		ingredients: [
			{ source: 'bls', sourceId: 'C131000', amountGrams: 150 },
			{ source: 'usda', sourceId: '2000', amountGrams: 50 },
		],
	};

	it('takes the logged amount as a proportion of the meal weight', async () => {
		// Meal weighs 200 g; logging 100 g takes half of each ingredient.
		const leaves = await mealLeaves(meal, 100);
		expect(leaves.map(l => [l.source, l.sourceId, l.amountGrams])).toEqual([
			['bls', 'C131000', 75],
			['usda', '2000', 25],
		]);
	});

	it('is identity in mass when logging the whole meal', async () => {
		const leaves = await mealLeaves(meal, 200);
		expect(leaves.reduce((s, l) => s + l.amountGrams, 0)).toBeCloseTo(200);
	});

	it('returns nothing for an empty or weightless meal', async () => {
		expect(await mealLeaves({ ingredients: [] }, 100)).toEqual([]);
		expect(await mealLeaves({ ingredients: [{ source: 'bls', sourceId: 'x', amountGrams: 0 }] }, 100)).toEqual([]);
	});
});

describe('recipeLeaves', () => {
	/** One ingredient line and the mapping that resolves it to `grams` of a BLS food. */
	const line = (si: number, ii: number, blsCode: string, grams: number) => ({
		item: { name: `Zutat ${blsCode}`, amount: '1' },
		mapping: {
			sectionIndex: si, ingredientIndex: ii, source: 'bls', blsCode,
			matchMethod: 'manual', gramsPerUnit: grams, excluded: false,
		},
	});

	/** A recipe of plain ingredient lines, one section. */
	const plain = (short_name: string, lines: ReturnType<typeof line>[], extra: any = {}) => ({
		_id: `id-${short_name}`,
		short_name,
		ingredients: [{ type: 'section', name: '', list: lines.map(l => l.item) }],
		nutritionMappings: lines.map(l => l.mapping),
		...extra,
	});

	const grams = (leaves: { amountGrams: number }[]) => leaves.reduce((s, l) => s + l.amountGrams, 0);

	beforeEach(() => recipeStore.clear());

	it('expands a base-recipe section stored as a bare ObjectId', async () => {
		// The food log queries the recipe without populating `baseRecipeRef`, so the
		// section carries an id and nothing else — the shape that used to drop a
		// pizza's whole dough from the log while the recipe page counted it.
		const dough = plain('teig', [line(0, 0, 'C0100', 300)]);
		recipeStore.set('teig', dough);

		const pizza = {
			ingredients: [
				{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 },
				{ type: 'section', name: 'Belag', list: [line(1, 0, 'C0200', 200).item] },
			],
			nutritionMappings: [{ ...line(1, 0, 'C0200', 200).mapping }],
		};

		const leaves = await recipeLeaves(pizza, 500);
		expect(leaves.map(l => l.sourceId).sort()).toEqual(['C0100', 'C0200']);
		// 500 g logged of a 500 g dish: every ingredient at its full weight.
		expect(grams(leaves)).toBeCloseTo(500);
		expect(leaves.find(l => l.sourceId === 'C0100')!.amountGrams).toBeCloseTo(300);
	});

	it('counts the base recipe in the denominator, not just in the nutrients', async () => {
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)]));
		const pizza = {
			ingredients: [
				{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 },
				{ type: 'section', name: 'Belag', list: [line(1, 0, 'C0200', 200).item] },
			],
			nutritionMappings: [line(1, 0, 'C0200', 200).mapping],
		};

		// Half the dish is half of each of its parts — not 250/200 of the toppings,
		// which is what dividing by the direct weight alone gave.
		const leaves = await recipeLeaves(pizza, 250);
		expect(grams(leaves)).toBeCloseTo(250);
		expect(leaves.find(l => l.sourceId === 'C0200')!.amountGrams).toBeCloseTo(100);
	});

	it('scales a base by its multiplier, in both the leaves and the weight', async () => {
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)]));
		const pizza = {
			ingredients: [
				{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 0.5 },
				{ type: 'section', name: 'Belag', list: [line(1, 0, 'C0200', 200).item] },
			],
			nutritionMappings: [line(1, 0, 'C0200', 200).mapping],
		};

		// Half a batch of dough: 150 g of it against 200 g of toppings.
		const leaves = await recipeLeaves(pizza, 350);
		expect(leaves.find(l => l.sourceId === 'C0100')!.amountGrams).toBeCloseTo(150);
		expect(grams(leaves)).toBeCloseTo(350);
	});

	it('follows an anchor-tag reference, and its multiplier from the mapping', async () => {
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)]));
		const pizza = {
			ingredients: [{ type: 'section', name: '', list: [
				{ name: '<a href="/de/teig">Teig</a>', amount: '1' },
				line(0, 1, 'C0200', 200).item,
			] }],
			nutritionMappings: [
				{ sectionIndex: 0, ingredientIndex: 0, recipeRef: 'teig', recipeRefMultiplier: 2, matchMethod: 'manual' },
				{ ...line(0, 1, 'C0200', 200).mapping, ingredientIndex: 1 },
			],
		};

		const leaves = await recipeLeaves(pizza, 800);
		expect(leaves.find(l => l.sourceId === 'C0100')!.amountGrams).toBeCloseTo(600);
		expect(grams(leaves)).toBeCloseTo(800);
	});

	it('carries a base recipe built on another base', async () => {
		recipeStore.set('anstellgut', plain('anstellgut', [line(0, 0, 'C0000', 100)]));
		recipeStore.set('teig', {
			...plain('teig', [line(1, 0, 'C0100', 300)]),
			ingredients: [
				{ type: 'reference', baseRecipeRef: 'id-anstellgut', baseMultiplier: 1 },
				{ type: 'section', name: '', list: [line(1, 0, 'C0100', 300).item] },
			],
		});
		const brot = {
			ingredients: [{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 }],
			nutritionMappings: [],
		};

		const leaves = await recipeLeaves(brot, 400);
		expect(leaves.map(l => l.sourceId).sort()).toEqual(['C0000', 'C0100']);
		expect(grams(leaves)).toBeCloseTo(400);
	});

	it('logs a recipe that is nothing but a base reference', async () => {
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)]));
		const leaves = await recipeLeaves(
			{ ingredients: [{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 }] },
			150,
		);
		expect(leaves).toHaveLength(1);
		expect(leaves[0].amountGrams).toBeCloseTo(150);
	});

	it('counts a base twice-named once', async () => {
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)]));
		const leaves = await recipeLeaves({
			ingredients: [
				{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 },
				{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 },
			],
		}, 300);
		expect(leaves).toHaveLength(1);
		expect(leaves[0].amountGrams).toBeCloseTo(300);
	});

	it('measures the log against the finished weight of the dish and of its base', async () => {
		// The dough weighs 270 g out of the oven, not the 300 g that went in; the
		// nutrients are all still there, so its leaf keeps its full 300 g.
		recipeStore.set('teig', plain('teig', [line(0, 0, 'C0100', 300)], {
			finalWeight: { mode: 'absolute', grams: 270 },
		}));
		const brot = {
			ingredients: [{ type: 'reference', baseRecipeRef: 'id-teig', baseMultiplier: 1 }],
			finalWeight: { mode: 'relative', percent: -10 },
		};

		// 270 g of base → 243 g of finished bread. Logging all of it takes the lot.
		const leaves = await recipeLeaves(brot, 243);
		expect(leaves[0].amountGrams).toBeCloseTo(300);
	});

	it('keeps an ingredient whose name merely links out', async () => {
		// A citation — "Kletzen, Schweiz: doerrbirnen.ch" — is still an ingredient.
		const cited = line(0, 0, 'C0300', 120);
		const leaves = await recipeLeaves({
			ingredients: [{ type: 'section', name: '', list: [
				{ name: 'Kletzen (<a href="https://doerrbirnen.ch">Bezugsquelle</a>)', amount: '1' },
			] }],
			nutritionMappings: [cited.mapping],
		}, 120);
		expect(leaves).toHaveLength(1);
		expect(leaves[0].sourceId).toBe('C0300');
	});

	it('returns nothing when no ingredient resolves', async () => {
		expect(await recipeLeaves({ ingredients: [], nutritionMappings: [] }, 100)).toEqual([]);
	});
});

describe('blendPer100g', () => {
	const leaf = (amountGrams: number, per100g: any) => ({ source: 'bls', sourceId: 'x', amountGrams, per100g, name: null } as any);

	it('reproduces summed macros exactly (blend × total = Σ contributions)', () => {
		const comps = [leaf(100, { calories: 200, protein: 10 }), leaf(100, { calories: 400, protein: 30 })];
		const blend = blendPer100g(comps, 200);
		expect(blend.calories * 200 / 100).toBeCloseTo(200 + 400);
		expect(blend.protein * 200 / 100).toBeCloseTo(10 + 30);
	});

	it('keeps a key present if any leaf reports it, and its total honest', () => {
		// Only the USDA-shaped leaf reports selenium.
		const comps = [leaf(100, { calories: 100 }), leaf(100, { calories: 100, selenium: 40 })];
		const blend = blendPer100g(comps, 200);
		expect(blend.selenium * 200 / 100).toBeCloseTo(40);
	});

	it('omits a key no leaf reports', () => {
		const blend = blendPer100g([leaf(100, { calories: 100 })], 100);
		expect('selenium' in blend).toBe(false);
	});

	it('treats a dangling leaf (null per100g) as zero contribution', () => {
		const comps = [leaf(100, { calories: 300 }), { ...leaf(100, null) }];
		// Denominator is the full 200 g, so the resolved half still reads 150 kcal/100g.
		const blend = blendPer100g(comps as any, 200);
		expect(blend.calories).toBeCloseTo(150);
	});
});

describe('flattenComponents', () => {
	it('prefers each leaf\'s live name, falling back to the row name', () => {
		const flat = flattenComponents([
			{ name: 'Chili', components: [
				{ source: 'bls', sourceId: 'a', amountGrams: 50, per100g: {}, name: 'Kidney beans' },
				{ source: 'off', sourceId: 'b', amountGrams: 30, per100g: null, name: null },
			] } as any,
		]);
		expect(flat.map(f => f.name)).toEqual(['Kidney beans', 'Chili']);
	});
});
