import { describe, it, expect } from 'vitest';
import { searchBlsUsda } from '$lib/server/nutritionSearchIndex';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { usdaDisplayName, usdaNameDe } from '$lib/data/usdaNamesDe';

/** Top USDA hits for a query, as the bilingual strings the search endpoint returns. */
function usdaHits(query: string, limit = 10): string[] {
	return searchBlsUsda(query)
		.filter((h) => h.source === 'usda')
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((h) => usdaDisplayName(NUTRITION_DB[h.idx].name));
}

describe('usdaDisplayName', () => {
	it('renders English first with German in parentheses (the mirror of BLS)', () => {
		expect(usdaDisplayName('Peppers, bell, red, raw')).toBe('Peppers, bell, red, raw (Paprika, rot, roh)');
	});

	it('falls back to the English name alone when untranslated', () => {
		expect(usdaDisplayName('Not A Real Food')).toBe('Not A Real Food');
	});

	it('covers the whole table', () => {
		const missing = NUTRITION_DB.filter((e) => !usdaNameDe(e.name));
		expect(missing).toHaveLength(0);
	});
});

describe('German names in the USDA translation', () => {
	it('pins the stock vocabulary to one rendering, so search cannot miss half the table', () => {
		// These repeat thousands of times across the corpus; per-name DeepL translation
		// returned several variants of each, which split the results for any query on them.
		const all = NUTRITION_DB.map((e) => usdaNameDe(e.name)!);
		const raw = all.filter((n) => /\broh\b/.test(n)).length;
		expect(raw).toBeGreaterThan(1000);
		// "cooked" is gegart throughout, never gekocht (which is reserved for "boiled").
		expect(usdaNameDe('Beef, chuck, short ribs, boneless, separable lean only, trimmed to 0" fat, choice, raw'))
			.toContain('nur abtrennbares mageres Fleisch');
	});

	it('keeps brand names untranslated', () => {
		const de = usdaNameDe('Babyfood, beverage, GERBER, GRADUATES, FRUIT SPLASHERS');
		expect(de).toContain('GERBER');
		expect(de).toContain('FRUIT SPLASHERS');
	});

	it('never emits an adjacent duplicate segment', () => {
		// English distinguishes qualifiers German merges ("Peppers, bell" is Paprika twice).
		const offenders = NUTRITION_DB.map((e) => usdaNameDe(e.name)!).filter((n) => {
			const parts = n.split(', ');
			return parts.some((p, i) => i > 0 && p.toLowerCase() === parts[i - 1].toLowerCase());
		});
		expect(offenders).toHaveLength(0);
	});
});

describe('searching USDA in German', () => {
	it('finds USDA foods from a German query', () => {
		const hits = usdaHits('hähnchen brust roh');
		expect(hits.some((h) => h.startsWith('Chicken, breast'))).toBe(true);
	});

	it('folds diacritics in the German names too', () => {
		expect(usdaHits('kurbis').length).toBeGreaterThan(0);
		expect(usdaHits('kürbis').length).toBeGreaterThan(0);
	});

	it('still matches the English names it always did', () => {
		expect(usdaHits('bell peppers raw red')[0]).toContain('Peppers, bell, red, raw');
	});
});
