import { describe, it, expect } from 'vitest';
import { triageState, trustLevel, buildRows, coverageOf } from '$lib/js/nutritionTriage';

const matched = {
	matchMethod: 'embedding',
	matchConfidence: 0.9,
	gramsPerUnit: 1,
	unitConversionSource: 'direct',
	manuallyEdited: false,
	excluded: false,
};

describe('trustLevel', () => {
	it('trusts a table, a density, a published portion or a typed number', () => {
		for (const src of ['direct', 'density', 'usda_portion', 'manual']) {
			expect(trustLevel({ gramsPerUnit: 5, unitConversionSource: src })).toBe('ok');
		}
	});

	it('flags a generic guess for the unit', () => {
		expect(trustLevel({ gramsPerUnit: 5, unitConversionSource: 'estimate' })).toBe('weak');
	});

	it('flags a unit that could not be converted at all', () => {
		// The quiet failure: gramsPerUnit 0 means the line contributes nothing, and
		// the old table showed a bare dash for it.
		expect(trustLevel({ gramsPerUnit: 0, unitConversionSource: 'none' })).toBe('none');
	});
});

describe('triageState', () => {
	it('is ok for a confident match measured in a real unit', () => {
		expect(triageState(matched, '200')).toBe('ok');
	});

	it('is open when nothing matched', () => {
		expect(triageState({ ...matched, matchMethod: 'none' }, '200')).toBe('open');
	});

	it('is skipped when deliberately excluded', () => {
		expect(triageState({ ...matched, excluded: true }, '200')).toBe('skipped');
	});

	it('is ref for a link to another recipe', () => {
		expect(triageState({ ...matched, recipeRef: 'pizzateig' }, '1')).toBe('ref');
	});

	it('is unsure below the confidence bar', () => {
		expect(triageState({ ...matched, matchConfidence: 0.5 }, '200')).toBe('unsure');
	});

	it('is unsure when the gram conversion was guessed', () => {
		// A perfect match measured by a rough estimate is the case a confidence
		// column cannot show.
		expect(triageState({ ...matched, unitConversionSource: 'estimate' }, '2')).toBe('unsure');
	});

	it('is unsure when the unit could not be converted', () => {
		expect(triageState({ ...matched, gramsPerUnit: 0 }, '2')).toBe('unsure');
	});

	it('is unsure when the amount had to be assumed', () => {
		expect(triageState(matched, '')).toBe('unsure');
		expect(triageState(matched, 'nach Geschmack')).toBe('unsure');
	});

	it('trusts a hand-made match even at low confidence', () => {
		expect(triageState({ ...matched, manuallyEdited: true, matchConfidence: 0 }, '200')).toBe('ok');
	});
});

describe('buildRows', () => {
	const ingredients = [
		{ name: 'Teig', type: 'section', list: [
			{ name: 'Mehl', unit: 'g', amount: '500' },
			{ name: '<a href="sauerteig">Sauerteig</a>', unit: 'g', amount: '100' },
		] },
		{ type: 'reference', baseRecipeRef: { short_name: 'pizzateig', name: 'Pizzateig' }, baseMultiplier: 0.5 },
		{ name: 'Belag', type: 'section', list: [{ name: 'Käse', unit: 'g', amount: '200' }] },
	];
	const mappings = [
		{ sectionIndex: 0, ingredientIndex: 0, ...matched },
		{ sectionIndex: 0, ingredientIndex: 1, matchMethod: 'none', excluded: true, recipeRef: 'sauerteig' },
		{ sectionIndex: 2, ingredientIndex: 0, ...matched },
	];

	it('lists cards in recipe order, base recipes included', () => {
		const rows = buildRows(ingredients, mappings);
		expect(rows.map((r) => r.kind)).toEqual(['ingredient', 'base', 'base', 'ingredient']);
		expect(rows.map((r) => r.index)).toEqual([1, 2, 3, 4]);
	});

	it('gives a type:reference section a card, which the old table never did', () => {
		const rows = buildRows(ingredients, mappings);
		const base = rows.find((r) => r.kind === 'base' && r.key.startsWith('base-1'));
		expect(base).toBeDefined();
		expect(base && 'slug' in base && base.slug).toBe('pizzateig');
	});

	it('resolves each ingredient line to grams', () => {
		const rows = buildRows(ingredients, mappings);
		const flour = rows.find((r) => r.key === '0-0');
		expect(flour && 'grams' in flour && flour.grams).toBe(500);
	});

	it('skips a mapping with no ingredient line behind it', () => {
		const rows = buildRows(ingredients, [{ sectionIndex: 9, ingredientIndex: 9, ...matched }]);
		expect(rows.filter((r) => r.kind === 'ingredient')).toHaveLength(0);
	});
});

describe('coverageOf', () => {
	const ingredients = [
		{ type: 'section', list: [
			{ name: 'Mehl', unit: 'g', amount: '500' },
			{ name: 'Hefe', unit: 'g', amount: '300' },
			{ name: 'Wasser', unit: 'g', amount: '200' },
		] },
	];

	it('weighs coverage by grams, not by row count', () => {
		// Two of three lines mapped, but they are only 200 of 1000 g — the number
		// a "2/3 zugeordnet" summary hides.
		const mappings = [
			{ sectionIndex: 0, ingredientIndex: 0, ...matched, matchMethod: 'none' },
			{ sectionIndex: 0, ingredientIndex: 1, ...matched, matchMethod: 'none' },
			{ sectionIndex: 0, ingredientIndex: 2, ...matched },
		];
		const c = coverageOf(buildRows(ingredients, mappings));
		expect(c.totalGrams).toBe(1000);
		expect(c.coveredGrams).toBe(200);
		expect(c.counts.open).toBe(2);
		expect(c.counts.ok).toBe(1);
	});

	it('counts a skipped line in the denominator only', () => {
		const mappings = [
			{ sectionIndex: 0, ingredientIndex: 0, ...matched },
			{ sectionIndex: 0, ingredientIndex: 1, ...matched, excluded: true },
			{ sectionIndex: 0, ingredientIndex: 2, ...matched },
		];
		const c = coverageOf(buildRows(ingredients, mappings));
		expect(c.totalGrams).toBe(1000);
		expect(c.coveredGrams).toBe(700);
		expect(c.counts.skipped).toBe(1);
	});

	it('adds what base recipes contribute', () => {
		const mappings = [{ sectionIndex: 0, ingredientIndex: 0, ...matched }];
		const c = coverageOf(buildRows(ingredients, mappings), [{ grams: 400, covered: 300 }]);
		expect(c.totalGrams).toBe(900);
		expect(c.coveredGrams).toBe(800);
	});
});
