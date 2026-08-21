import { describe, it, expect } from 'vitest';
import { browseToParams, applyParamsToBrowse, hasBrowseParams } from '../../../src/lib/js/browseParams';
import { createRecipeBrowse } from '../../../src/lib/js/recipeBrowse.svelte';
import { MACRO_FILTER_DEFAULTS } from '../../../src/lib/js/recipeMacros';

const recipes = [
	{ _id: '1', name: 'Suppe', short_name: 'suppe', category: 'Suppe', tags: ['warm'] },
	{ _id: '2', name: 'Brot', short_name: 'brot', category: 'Brot', tags: ['hefe'] },
];

const browse = () => createRecipeBrowse(() => recipes);

describe('browseToParams', () => {
	it('writes nothing for an untouched listing', () => {
		expect(browseToParams(browse()).toString()).toBe('');
	});

	it('carries every facet the rail can set', () => {
		const b = browse();
		b.query = 'suppe';
		b.category = 'Suppe';
		b.tags.add('warm');
		b.months.add(3);
		b.months.add(11);
		b.inSeasonOnly = true;
		b.favoritesOnly = true;
		b.sort = 'alpha';
		b.macro.proteinMin = 25;
		b.macro.kcalMax = 400;
		b.macro.includeUnknown = false;

		const p = browseToParams(b);
		expect(p.get('q')).toBe('suppe');
		expect(p.get('category')).toBe('Suppe');
		expect(p.getAll('tag')).toEqual(['warm']);
		expect(p.getAll('month')).toEqual(['3', '11']);
		expect(p.get('season')).toBe('now');
		expect(p.get('fav')).toBe('1');
		expect(p.get('sort')).toBe('alpha');
		expect(p.get('p')).toBe('25-100');
		expect(p.get('kcal')).toBe('0-400');
		expect(p.get('unknown')).toBe('0');
	});

	// A stable string is what lets the writer skip a no-op replaceState, and what
	// keeps a shared link identical to the one the sender saw.
	it('orders repeated values, so the same filters give the same string', () => {
		const a = browse();
		a.tags.add('b');
		a.tags.add('a');
		a.months.add(5);
		a.months.add(2);
		const c = browse();
		c.tags.add('a');
		c.tags.add('b');
		c.months.add(2);
		c.months.add(5);
		expect(browseToParams(a).toString()).toBe(browseToParams(c).toString());
	});

	it('leaves the default sort and untouched macro ranges out', () => {
		const b = browse();
		b.query = 'x';
		const p = browseToParams(b);
		expect(p.has('sort')).toBe(false);
		expect(p.has('p')).toBe(false);
		expect(p.has('unknown')).toBe(false);
	});
});

describe('applyParamsToBrowse', () => {
	it('round-trips a full filter set', () => {
		const a = browse();
		a.query = 'brot';
		a.category = 'Brot';
		a.tags.add('hefe');
		a.months.add(7);
		a.inSeasonOnly = true;
		a.favoritesOnly = true;
		a.sort = 'shuffle';
		a.macro.fatMax = 30;
		a.macro.includeUnknown = false;

		const b = browse();
		applyParamsToBrowse(b, browseToParams(a));

		expect(browseToParams(b).toString()).toBe(browseToParams(a).toString());
		expect(b.query).toBe('brot');
		expect([...b.months]).toEqual([7]);
		expect(b.sort).toBe('shuffle');
		expect(b.macro.fatMax).toBe(30);
		expect(b.macro.includeUnknown).toBe(false);
	});

	// Applying is also how "clear all" is expressed, so it must not leave anything
	// from the previous set behind.
	it('replaces the previous state rather than adding to it', () => {
		const b = browse();
		b.query = 'suppe';
		b.tags.add('warm');
		b.sort = 'alpha';
		applyParamsToBrowse(b, new URLSearchParams(''));
		expect(b.query).toBe('');
		expect([...b.tags]).toEqual([]);
		expect(b.sort).toBe('season');
		expect(b.macro).toEqual(MACRO_FILTER_DEFAULTS);
	});

	it('ignores nonsense rather than filtering to nothing', () => {
		const b = browse();
		applyParamsToBrowse(b, new URLSearchParams('month=13&month=abc&sort=sideways&p=x-y'));
		expect([...b.months]).toEqual([]);
		expect(b.sort).toBe('season');
		expect(b.macro.proteinMin).toBe(MACRO_FILTER_DEFAULTS.proteinMin);
		expect(b.macro.proteinMax).toBe(MACRO_FILTER_DEFAULTS.proteinMax);
	});
});

describe('hasBrowseParams', () => {
	it('tells a filtered URL from a bare one', () => {
		expect(hasBrowseParams(new URLSearchParams(''))).toBe(false);
		expect(hasBrowseParams(new URLSearchParams('utm_source=mail'))).toBe(false);
		expect(hasBrowseParams(new URLSearchParams('tag=hefe'))).toBe(true);
		expect(hasBrowseParams(new URLSearchParams('kcal=0-400'))).toBe(true);
	});
});
