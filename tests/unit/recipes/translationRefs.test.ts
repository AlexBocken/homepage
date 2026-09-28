import { describe, it, expect } from 'vitest';
import { baseRecipeShortName, mergeRefs } from '$lib/js/translationRefs';

const names = new Map([['teig', { enName: 'Dough' }]]);

describe('baseRecipeShortName', () => {
	it('reads a populated reference or takes the short_name as is', () => {
		expect(baseRecipeShortName({ short_name: 'teig', _id: 'x' })).toBe('teig');
		expect(baseRecipeShortName('teig')).toBe('teig');
	});
});

describe('mergeRefs', () => {
	const germanRef = { type: 'reference', baseRecipeRef: 'teig', name: 'Teig', itemsBefore: [] };
	const germanSection = { type: 'section', name: 'Füllung', list: [{ name: 'Äpfel' }] };

	it('keeps an English reference to the same base recipe at the same position', () => {
		const englishRef = { type: 'reference', baseRecipeRef: 'teig', name: 'My dough' };
		const out = mergeRefs([germanRef], [englishRef], names);
		expect(out[0]).toBe(englishRef);
	});

	it('names a new reference after the base recipe in English', () => {
		const out = mergeRefs([germanRef], [], names);
		expect(out[0]).toEqual({ ...germanRef, name: 'Dough' });
		expect(out[0]).not.toBe(germanRef);
	});

	it('uses the German reference when no English name is known', () => {
		const other = { ...germanRef, baseRecipeRef: 'anders' };
		expect(mergeRefs([other], [], names)[0]).toBe(other);
	});

	it('replaces an English reference to a different base recipe', () => {
		const englishRef = { type: 'reference', baseRecipeRef: 'anders', name: 'Other' };
		expect(mergeRefs([germanRef], [englishRef], names)[0]).toEqual({ ...germanRef, name: 'Dough' });
	});

	it('compares populated references by identity, as before', () => {
		const populated = { short_name: 'teig' };
		const g = { ...germanRef, baseRecipeRef: populated };
		const e = { type: 'reference', baseRecipeRef: { short_name: 'teig' }, name: 'Kept?' };
		// A different object is not the same reference, so the German one (renamed) wins.
		expect(mergeRefs([g], [e], names)[0]).toEqual({ ...g, name: 'Dough' });
	});

	it('keeps an English section, and falls back to the German one', () => {
		const englishSection = { type: 'section', name: 'Filling', list: [{ name: 'Apples' }] };
		expect(mergeRefs([germanSection], [englishSection], names)[0]).toBe(englishSection);
		expect(mergeRefs([germanSection], [], names)[0]).toBe(germanSection);
		const englishRef = { type: 'reference', baseRecipeRef: 'teig' };
		expect(mergeRefs([germanSection], [englishRef], names)[0]).toBe(germanSection);
	});

	it('treats a reference without baseRecipeRef as a section', () => {
		const bare = { type: 'reference', name: 'x' };
		const englishSection = { type: 'section', name: 'y' };
		expect(mergeRefs([bare], [englishSection], names)[0]).toBe(englishSection);
		expect(mergeRefs([bare], [{ type: 'reference' }], names)[0]).toBe(bare);
	});

	it('follows the German list length', () => {
		const out = mergeRefs([germanSection], [{ type: 'section' }, { type: 'section' }], names);
		expect(out).toHaveLength(1);
	});
});
