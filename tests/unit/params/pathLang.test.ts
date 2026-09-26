import { describe, it, expect } from 'vitest';
import { pathLang } from '$lib/js/slugs';
import { errorLang } from '$lib/server/errorQuote';

describe('pathLang', () => {
	it.each([
		['/', 'de'],
		['/faith', 'en'],
		['/faith/prayers', 'en'],
		['/glaube', 'de'],
		['/fides', 'la'],
		['/fides/orationes/ave-maria', 'la'],
		['/recipes', 'en'],
		['/rezepte/schokokuchen', 'de'],
		['/hikes', 'en'],
		['/wanderungen', 'de'],
		['/expenses/dash', 'en'],
		['/cospend/dash', 'de'],
		['/settings', 'en'],
		['/einstellungen', 'de'],
		['/register', 'en'],
		['/fitness/stats', 'de'],
		['/facts', 'de']
	] as const)('%s → %s', (path, lang) => {
		expect(pathLang(path)).toBe(lang);
	});
});

describe('errorLang', () => {
	it('matches the page language, with Latin pages falling back to German', () => {
		// These disagreed with the page language before: no trailing slash, Latin.
		expect(errorLang('/faith')).toBe('en');
		expect(errorLang('/recipes')).toBe('en');
		expect(errorLang('/expenses')).toBe('en');
		expect(errorLang('/fides/orationes')).toBe('de');
		expect(errorLang('/glaube/gebete')).toBe('de');
	});
});
