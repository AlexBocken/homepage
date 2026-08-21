import { describe, it, expect } from 'vitest';
import { browseToParams, applyParamsToBrowse, hasBrowseParams, canonicalParams } from '../../../src/lib/js/browseParams';
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

	// The script-free fallback is two separate range inputs, so a person can drag the
	// lower one past the upper one.
	it('reads a crossed pair as the range it describes', () => {
		const b = browse();
		applyParamsToBrowse(b, new URLSearchParams('pmin=80&pmax=20'));
		expect(b.macro.proteinMin).toBe(20);
		expect(b.macro.proteinMax).toBe(80);
	});

	it('accepts the separate bounds a plain form submits', () => {
		const b = browse();
		applyParamsToBrowse(b, new URLSearchParams('kcalmin=100&kcalmax=400'));
		expect(b.macro.kcalMin).toBe(100);
		expect(b.macro.kcalMax).toBe(400);
	});

	// The script-free lower slider runs on a reversed axis so the browser fills the
	// half the filter keeps; its value arrives negated.
	it('reads the reversed lower bound the fallback slider submits', () => {
		const b = browse();
		applyParamsToBrowse(b, new URLSearchParams('pminneg=-25&pmax=60'));
		expect(b.macro.proteinMin).toBe(25);
		expect(b.macro.proteinMax).toBe(60);
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

describe('canonicalParams', () => {
	it('leaves a URL the app itself wrote alone', () => {
		expect(canonicalParams(new URLSearchParams('p=25-60&category=Suppe'))).toBeNull();
		expect(canonicalParams(new URLSearchParams(''))).toBeNull();
	});

	it('rewrites what a plain form submits into the spelling the app writes', () => {
		const out = canonicalParams(new URLSearchParams('pminneg=-25&pmax=60&kcalmax=400'));
		expect(out?.get('p')).toBe('25-60');
		expect(out?.get('kcal')).toBe('0-400');
		expect(out?.has('pminneg')).toBe(false);
		expect(out?.has('pmax')).toBe(false);
	});

	it('keeps the filters that came along with it', () => {
		const out = canonicalParams(new URLSearchParams('category=Suppe&tag=warm&pmax=60'));
		expect(out?.get('category')).toBe('Suppe');
		expect(out?.getAll('tag')).toEqual(['warm']);
	});

	it('drops a range that was submitted at its full extent', () => {
		const out = canonicalParams(new URLSearchParams('pminneg=0&pmax=100&q=brot'));
		expect(out?.has('p')).toBe(false);
		expect(out?.get('q')).toBe('brot');
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
