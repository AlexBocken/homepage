import { describe, it, expect } from 'vitest';
import { queryWords, scoreName, foldText } from '$lib/server/nutritionSearchIndex';

describe('queryWords', () => {
	it('splits on whitespace', () => {
		expect(queryWords('bell pepper raw')).toEqual(['bell', 'pepper', 'raw']);
	});

	it('strips punctuation, so a name copied verbatim from USDA still tokenizes', () => {
		// USDA writes "Peppers, bell, green, raw" — typing that exactly used to
		// search for the literal word "peppers," and match nothing.
		expect(queryWords('peppers, bell')).toEqual(['peppers', 'bell']);
		expect(queryWords('peppers, bell, red, raw')).toEqual(['peppers', 'bell', 'red', 'raw']);
		expect(queryWords('raw, red bell peppers!')).toEqual(['raw', 'red', 'bell', 'peppers']);
	});

	it('keeps letters with diacritics intact', () => {
		expect(queryWords('ragù alla bolognese')).toEqual(['ragù', 'alla', 'bolognese']);
		expect(queryWords('hähnchen-brust')).toEqual(['hähnchen', 'brust']);
	});

	it('keeps digits', () => {
		expect(queryWords('vitamin b12, 100g')).toEqual(['vitamin', 'b12', '100g']);
	});

	it('is empty for punctuation-only input', () => {
		expect(queryWords('  ,,, ')).toEqual([]);
	});
});

describe('scoreName', () => {
	const score = (q: string, name: string) => scoreName(q, queryWords(q), name);

	it('scores a query whose words appear in the name, regardless of order', () => {
		const name = 'peppers, bell, red, raw';
		expect(score('peppers bell red', name)).toBeGreaterThan(0);
		expect(score('bell peppers raw red', name)).toBeGreaterThan(0);
		expect(score('red bell peppers', name)).toBeGreaterThan(0);
		expect(score('raw red bell peppers', name)).toBeGreaterThan(0);
	});

	it('ranks the in-order phrasing at least as high as a reordered one', () => {
		const name = 'peppers, bell, red, raw';
		expect(score('peppers bell red', name)).toBeGreaterThanOrEqual(score('red bell peppers', name));
	});

	it('still requires every query word to be present', () => {
		// "green" is not in this entry — a partial hit is a different food.
		expect(score('bell green', 'peppers, bell, red, raw')).toBe(0);
		expect(score('banana bell', 'peppers, bell, red, raw')).toBe(0);
	});

	it('returns 0 when nothing matches', () => {
		expect(score('banana', 'peppers, bell, red, raw')).toBe(0);
	});

	it('leaves in-order single-word scoring untouched', () => {
		// Single words always match in order, so they take the original path and
		// must keep their exact previous score for ranking to stay stable.
		const name = 'bananas, raw';
		expect(score('banana', name)).toBe(scoreName('banana', ['banana'], name));
		expect(score('banana', name)).toBeGreaterThan(0);
	});

	it('works on folded text (the index folds before scoring)', () => {
		const folded = foldText('Hähnchenbrust, roh');
		expect(score('roh hahnchenbrust', folded)).toBeGreaterThan(0);
	});
});
