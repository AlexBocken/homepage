import { describe, it, expect } from 'vitest';
import { BLS_DB } from '$lib/data/blsDb';
import {
	HOT_DRINKS, HOT_DRINK_GROUPS, DEFAULT_HOT_DRINK_CODE,
	hotDrinkLabel, hotDrinkLogName, isHotDrinkRef, resolveHotDrink,
	readHotDrinkPrefs, HOT_DRINK_ENABLED_COOKIE, HOT_DRINK_CODE_COOKIE,
} from '$lib/fitness/hotDrinks';

describe('hot drinks', () => {
	it('names every drink with a code the BLS actually has', () => {
		const byCode = new Map(BLS_DB.map(e => [e.blsCode, e]));
		for (const drink of HOT_DRINKS) {
			const entry = byCode.get(drink.code);
			expect(entry, `${drink.code} (${drink.de})`).toBeDefined();
			// The names are the BLS ones verbatim — see hotDrinkLogName.
			expect(entry!.nameDe).toBe(drink.de);
			expect(entry!.nameEn).toBe(drink.en);
		}
	});

	// The bug this guards: the quick button logged a prettified name while the food
	// search logged `German (English)`, so one tea showed up as two diary foods.
	it('logs the same name /api/nutrition/search would produce', () => {
		const blackTea = resolveHotDrink(DEFAULT_HOT_DRINK_CODE);
		const entry = BLS_DB.find(e => e.blsCode === DEFAULT_HOT_DRINK_CODE)!;
		expect(hotDrinkLogName(blackTea)).toBe(`${entry.nameDe} (${entry.nameEn})`);
	});

	it('drops the BLS infusion tag from picker labels only', () => {
		const blackTea = resolveHotDrink(DEFAULT_HOT_DRINK_CODE);
		expect(hotDrinkLabel(blackTea, true)).toBe('Black tea');
		expect(hotDrinkLabel(blackTea, false)).toBe('Schwarztee');
		expect(hotDrinkLogName(blackTea)).toContain('(Getränk)');
	});

	it('falls back to black tea for a missing or unknown code', () => {
		expect(resolveHotDrink(null).code).toBe(DEFAULT_HOT_DRINK_CODE);
		expect(resolveHotDrink('Z999999').code).toBe(DEFAULT_HOT_DRINK_CODE);
	});

	it('recognises logged entries by code, not by name', () => {
		expect(isHotDrinkRef('bls', DEFAULT_HOT_DRINK_CODE)).toBe(true);
		// A milk blend is a hot drink despite its `M` code and English-only name.
		expect(isHotDrinkRef('bls', 'M208000')).toBe(true);
		expect(isHotDrinkRef('usda', DEFAULT_HOT_DRINK_CODE)).toBe(false);
		expect(isHotDrinkRef('bls', undefined)).toBe(false);
		// Tea-flavoured food is not a drink.
		expect(isHotDrinkRef('bls', 'W121100')).toBe(false);
	});

	// The server load reads these to decide whether the mug is in the first paint,
	// so an absent or junk cookie has to land on the same answer the client would.
	describe('stored preference', () => {
		const read = (jar: Record<string, string>) => readHotDrinkPrefs(name => jar[name]);

		it('defaults to on and black tea when nothing is stored', () => {
			expect(read({})).toEqual({ enabled: true, code: DEFAULT_HOT_DRINK_CODE });
		});

		it('treats only an explicit 0 as off', () => {
			expect(read({ [HOT_DRINK_ENABLED_COOKIE]: '0' }).enabled).toBe(false);
			expect(read({ [HOT_DRINK_ENABLED_COOKIE]: '1' }).enabled).toBe(true);
			expect(read({ [HOT_DRINK_ENABLED_COOKIE]: 'nonsense' }).enabled).toBe(true);
		});

		it('ignores a code that is not a drink on this list', () => {
			expect(read({ [HOT_DRINK_CODE_COOKIE]: 'N610100' }).code).toBe('N610100');
			expect(read({ [HOT_DRINK_CODE_COOKIE]: 'G561100' }).code).toBe(DEFAULT_HOT_DRINK_CODE);
			expect(read({ [HOT_DRINK_CODE_COOKIE]: '' }).code).toBe(DEFAULT_HOT_DRINK_CODE);
		});
	});

	it('puts every drink in a group the picker renders', () => {
		for (const drink of HOT_DRINKS) {
			expect(HOT_DRINK_GROUPS).toContain(drink.group);
		}
		for (const group of HOT_DRINK_GROUPS) {
			expect(HOT_DRINKS.some(d => d.group === group)).toBe(true);
		}
	});
});
