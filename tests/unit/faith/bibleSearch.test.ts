import { describe, it, expect, beforeAll } from 'vitest';
import { searchBible, searchBook } from '$lib/server/bibleBooks';
import { foldUmlauts } from '$lib/faith/bibleCanon';

describe('Bible search by language', () => {
	// The first search per language parses every book to build its index
	beforeAll(async () => {
		await Promise.all([searchBible('xx', 'de'), searchBible('xx', 'la')]);
	}, 60_000);

	it('searches the Vulgate for the Latin reader', async () => {
		const hits = await searchBook('joh', 'in principio erat verbum', 'la');
		expect(hits[0]).toMatchObject({ chapter: 1, verse: 1 });
		expect(hits[0].text).toMatch(/^In principio erat verbum/);
	});

	it('does not find Latin words in the German text, nor German in the Latin', async () => {
		expect(await searchBook('joh', 'in principio', 'de')).toEqual([]);
		expect(await searchBook('joh', 'im anfange', 'la')).toEqual([]);
		expect((await searchBook('joh', 'im anfange', 'de'))[0]).toMatchObject({ chapter: 1, verse: 1 });
	});

	it('matches the Vulgate ligatures from a plain spelling', async () => {
		expect(foldUmlauts('Cælum et terra')).toBe('caelum et terra');
		const hits = await searchBook('gen', 'creavit deus caelum', 'la');
		expect(hits[0]).toMatchObject({ chapter: 1, verse: 1 });
		expect(hits[0].text).toContain('cælum');
	});
});
