import { describe, it, expect } from 'vitest';
import {
	MACRO_FILTER_DEFAULTS,
	MACRO_KCAL_CEILING,
	isMacroFilterActive,
	matchesMacroFilter,
	parsePortions,
	recipeMacros
} from '$lib/js/recipeMacros';

// The listing filters on shares of calories, not grams, so a recipe's split has
// to be derived the same way a macro target is written. `recipeMacros` is also
// the gate that decides whether a recipe counts as having nutrition at all.

describe('parsePortions', () => {
	it('reads the leading count out of a portions string', () => {
		expect(parsePortions('4 Portionen')).toBe(4);
		expect(parsePortions('ca. 12 Stück')).toBe(12);
		expect(parsePortions('2,5 Portionen')).toBe(2.5);
	});

	it('is 0 when there is no usable count', () => {
		expect(parsePortions('')).toBe(0);
		expect(parsePortions(undefined)).toBe(0);
		expect(parsePortions('ein Blech')).toBe(0);
		expect(parsePortions('0 Portionen')).toBe(0);
	});
});

describe('recipeMacros', () => {
	// 20 g protein (80 kcal), 10 g fat (90 kcal), 30 g carbs (120 kcal) = 290 kcal
	const per100g = { calories: 290, protein: 20, fat: 10, carbs: 30 };

	it('splits by calories, not by mass', () => {
		const macros = recipeMacros(per100g, 1000, '4 Portionen')!;
		expect(macros.protein).toBe(28); // 80/290
		expect(macros.fat).toBe(31); // 90/290
		expect(macros.carbs).toBe(41); // remainder
	});

	it('always totals exactly 100 %', () => {
		const macros = recipeMacros({ calories: 100, protein: 3, fat: 3, carbs: 3 }, 500, '3')!;
		expect(macros.protein + macros.fat + macros.carbs).toBe(100);
	});

	it('divides energy down to one portion', () => {
		// 1000 g at 290 kcal/100 g = 2900 kcal over 4 portions.
		expect(recipeMacros(per100g, 1000, '4 Portionen')!.kcalPortion).toBe(725);
	});

	it('leaves energy per portion null when the recipe states no portions', () => {
		expect(recipeMacros(per100g, 1000, '')!.kcalPortion).toBeNull();
		expect(recipeMacros(per100g, 0, '4')!.kcalPortion).toBeNull();
	});

	it('is null when nutrition was never calculated or carries no energy', () => {
		expect(recipeMacros(null, 500, '4')).toBeNull();
		expect(recipeMacros({ calories: 0, protein: 0, fat: 0, carbs: 0 }, 500, '4')).toBeNull();
		expect(recipeMacros({ calories: 200 }, 500, '4')).toBeNull();
	});
});

describe('matchesMacroFilter', () => {
	const highProtein = { kcal100: 150, kcalPortion: 400, protein: 45, fat: 25, carbs: 30 };
	const sugary = { kcal100: 400, kcalPortion: 900, protein: 5, fat: 15, carbs: 80 };

	it('keeps everything at defaults', () => {
		expect(isMacroFilterActive(MACRO_FILTER_DEFAULTS)).toBe(false);
		expect(matchesMacroFilter(highProtein, MACRO_FILTER_DEFAULTS)).toBe(true);
		expect(matchesMacroFilter(sugary, MACRO_FILTER_DEFAULTS)).toBe(true);
	});

	it('filters on a protein floor', () => {
		const f = { ...MACRO_FILTER_DEFAULTS, proteinMin: 25 };
		expect(isMacroFilterActive(f)).toBe(true);
		expect(matchesMacroFilter(highProtein, f)).toBe(true);
		expect(matchesMacroFilter(sugary, f)).toBe(false);
	});

	it('filters on a carbohydrate ceiling', () => {
		const f = { ...MACRO_FILTER_DEFAULTS, carbsMax: 30 };
		expect(matchesMacroFilter(highProtein, f)).toBe(true);
		expect(matchesMacroFilter(sugary, f)).toBe(false);
	});

	it('reads the energy bound per portion where there is one', () => {
		const f = { ...MACRO_FILTER_DEFAULTS, kcalMax: 500 };
		expect(matchesMacroFilter(highProtein, f)).toBe(true);
		expect(matchesMacroFilter(sugary, f)).toBe(false);
	});

	it('falls back to energy per 100 g when the recipe states no portions', () => {
		const noPortions = { kcal100: 700, kcalPortion: null, protein: 10, fat: 60, carbs: 30 };
		expect(matchesMacroFilter(noPortions, { ...MACRO_FILTER_DEFAULTS, kcalMax: 500 })).toBe(false);
		expect(matchesMacroFilter(noPortions, { ...MACRO_FILTER_DEFAULTS, kcalMax: 800 })).toBe(true);
	});

	it('treats the top of the energy track as no upper bound', () => {
		const huge = { kcal100: 400, kcalPortion: 4000, protein: 10, fat: 40, carbs: 50 };
		expect(matchesMacroFilter(huge, MACRO_FILTER_DEFAULTS)).toBe(true);
		expect(
			matchesMacroFilter(huge, { ...MACRO_FILTER_DEFAULTS, kcalMax: MACRO_KCAL_CEILING - 50 })
		).toBe(false);
	});

	it('lets the unknown-nutrition switch decide recipes with no data', () => {
		expect(matchesMacroFilter(null, MACRO_FILTER_DEFAULTS)).toBe(true);
		expect(matchesMacroFilter(null, { ...MACRO_FILTER_DEFAULTS, includeUnknown: false })).toBe(false);
	});
});
