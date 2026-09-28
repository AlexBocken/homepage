import { describe, it, expect } from 'vitest';
import {
	aggregateMealPer100g,
	mealTotalGrams,
	mealTotalCal,
	mealPreview,
	ingredientsTotalNutrition,
	isLiquidIngredient,
	type MealLike
} from '$lib/fitness/customMeal';
import expected from './__fixtures__/customMeal.expected.json';

// Pins custom-meal arithmetic to the outputs it had while it lived in the
// nutrition diary and meal editor pages. The expected numbers were produced by
// that page code, unchanged, on the fixtures below — exact, not approximate:
// the same sums in the same order must give the same doubles.

const MEALS: Record<keyof typeof expected, MealLike> = {
	// Oats + whole milk (a BLS drink code) + USDA almonds + an ingredient with no
	// nutrition at all: trace minerals and sparsely measured keys come from one
	// source each, and must not be diluted by the others.
	MIXED: {
		ingredients: [
			{ name: 'Haferflocken', source: 'bls', sourceId: 'C133000', amountGrams: 60,
				per100g: { calories: 370, protein: 13.5, fat: 7, saturatedFat: 1.2, carbs: 58.7, fiber: 10, sugars: 1.1, iron: 4.2, magnesium: 130, zinc: 3.2, vitaminB6: 0.16, leucine: 1.03, starch: 55 } },
			{ name: 'Vollmilch', source: 'bls', sourceId: 'N110000', amountGrams: 250,
				per100g: { calories: 64, protein: 3.3, fat: 3.5, saturatedFat: 2.2, carbs: 4.8, sugars: 4.8, calcium: 120, potassium: 150, iodine: 11, lactose: 4.7, vitaminB12: 0.4 } },
			{ name: 'Almonds, raw', source: 'usda', sourceId: '170567', amountGrams: 20,
				per100g: { calories: 579, protein: 21.2, fat: 49.9, saturatedFat: 3.8, carbs: 21.6, fiber: 12.5, sugars: 4.4, copper: 1.03, manganese: 2.18, selenium: 4.1, vitaminE: 25.6, alcohol: 0 } },
			{ name: 'Honig', source: 'off', sourceId: '123', amountGrams: 10 }
		]
	},
	// Liquids by name (German and English) and one solid.
	DRINKS: {
		ingredients: [
			{ name: 'Kaffee schwarz', source: 'off', sourceId: 'x1', amountGrams: 200, per100g: { calories: 2, caffeine: 40, potassium: 49 } },
			{ name: 'Trinkwasser', source: 'off', sourceId: 'x2', amountGrams: 300, per100g: { calories: 0 } },
			{ name: 'Water, bottled', source: 'usda', sourceId: 'x3', amountGrams: 100, per100g: {} },
			{ name: 'Zucker', source: 'bls', sourceId: 'S100000', amountGrams: 8, per100g: { calories: 400, carbs: 100, sugars: 100 } }
		]
	},
	EMPTY: { ingredients: [] },
	// Zero grams: nothing scales, and a trace mineral measured over 0 g is not written.
	ZERO: {
		ingredients: [
			{ name: 'Salz', source: 'bls', sourceId: 'R', amountGrams: 0, per100g: { calories: 0, sodium: 38758, copper: 0.03 } }
		]
	}
};

describe('custom meal aggregation', () => {
	for (const [name, meal] of Object.entries(MEALS) as [keyof typeof expected, MealLike][]) {
		describe(name, () => {
			const want = expected[name];
			it('blends per-100 g figures, weight and liquid', () => {
				expect(aggregateMealPer100g(meal)).toEqual(want.aggregate);
			});
			it('totals grams and kcal', () => {
				expect(mealTotalGrams(meal)).toBe(want.totalGrams);
				expect(mealTotalCal(meal)).toBe(want.totalCal);
			});
			it('previews a chosen amount', () => {
				expect(mealPreview(meal, 150)).toEqual(want.preview150);
				expect(mealPreview(meal, mealTotalGrams(meal) * 0.5)).toEqual(want.previewHalf);
			});
			it("sums the editor's macro totals", () => {
				expect(ingredientsTotalNutrition(meal.ingredients)).toEqual(want.ingredientsTotal);
			});
			it('tells liquid ingredients apart', () => {
				expect(meal.ingredients.map(isLiquidIngredient)).toEqual(want.liquid);
			});
		});
	}

	it('keeps a trace mineral at its measured concentration', () => {
		// Copper only comes from the almonds: 1.03 mg/100 g, not diluted by 320 g of
		// oats and milk that never reported it.
		const { per100g, totalGrams, liquidMl } = aggregateMealPer100g(MEALS.MIXED);
		expect(per100g.copper).toBe(1.03);
		expect(per100g.caffeine).toBeUndefined();
		expect(totalGrams).toBe(340);
		expect(liquidMl).toBe(250);
	});

	it('uses the stored calories, with no Atwater fallback', () => {
		// The honey has no nutrition, so it adds grams but no kcal.
		expect(mealTotalCal(MEALS.MIXED)).toBeCloseTo(222 + 160 + 115.8, 10);
	});
});
