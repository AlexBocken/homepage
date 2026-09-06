import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { noteSegments, parseReference, splitMarkers, stripMarkers, supToInt } from '../../../src/lib/faith/bibleText';
import { CANON, CANON_BY_TESTAMENT, bookName, canonSlug } from '../../../src/lib/faith/bibleCanon';
import { booksFromJson } from '../../../scripts/allioliImport';

describe('verse markers', () => {
	it('reads superscript digit runs as footnote numbers', () => {
		expect(supToInt('¹')).toBe(1);
		expect(supToInt('³⁷')).toBe(37);
	});

	it('splits prose from markers and strips them again', () => {
		const text = 'Im Anfange¹ war² das Wort,³ und das Wort war bei⁴ Gott.';
		const segs = splitMarkers(text);
		expect(segs.filter((s) => s.kind === 'marker').map((s) => (s as { number: number }).number)).toEqual([1, 2, 3, 4]);
		expect(segs[0]).toEqual({ kind: 'text', text: 'Im Anfange' });
		expect(stripMarkers(text)).toBe('Im Anfange war das Wort, und das Wort war bei Gott.');
	});

	it('cuts the bracketed parallel passages out of the verse, wherever they sit', () => {
		const end = splitMarkers('Es war²⁰ ein Mensch von Gott gesandt,²¹ sein Name war Johannes. [Mt 3,1, Mk 1,2]');
		expect(end.at(-1)).toEqual({ kind: 'refs', refs: ['Mt 3,1', 'Mk 1,2'] });
		expect(end.at(-2)).toEqual({ kind: 'text', text: ' sein Name war Johannes.' });
		const mid = splitMarkers('Psalm Davids, als ihn Absalom verfolgte. [2Sam 17,12] Herr! erhöre mein Gebet.');
		expect(mid.map((s) => s.kind)).toEqual(['text', 'refs', 'text']);
		expect(splitMarkers('Jakob aber zeugte den Judas;⁴ [Gen 21,2ff,Gen 25, Gen 26].').at(-2)).toEqual({ kind: 'refs', refs: ['Gen 21,2ff', 'Gen 25', 'Gen 26'] });
		expect(stripMarkers('sein Name war Johannes. [Mt 3,1, Mk 1,2]')).toBe('sein Name war Johannes.');
		expect(stripMarkers('verfolgte. [2Sam 17,12] Herr!')).toBe('verfolgte. Herr!');
	});
});

describe('footnote references', () => {
	it('turns bracket groups into one reference per book and keeps the prose', () => {
		const segs = noteSegments('Ehe etwas ward. [Gen 1,1, Spr 8,23] Mittelbar folgt (V. 14) hieraus.');
		expect(segs).toEqual([
			{ kind: 'text', text: 'Ehe etwas ward. ' },
			{ kind: 'ref', reference: 'Gen 1,1' },
			{ kind: 'text', text: ', ' },
			{ kind: 'ref', reference: 'Spr 8,23' },
			{ kind: 'text', text: ' Mittelbar folgt (' },
			{ kind: 'verse', verse: 14 },
			{ kind: 'text', text: ') hieraus.' }
		]);
	});

	it('parses the reference shapes Allioli uses', () => {
		expect(parseReference('Gen 1,1')).toEqual({ book: 'Gen', chapter: 1, from: 1, to: 1 });
		expect(parseReference('Spr 8,22-31')).toEqual({ book: 'Spr', chapter: 8, from: 22, to: 31 });
		expect(parseReference('Weish 7')).toEqual({ book: 'Weish', chapter: 7 });
		expect(parseReference('Lk 24,44ff')).toEqual({ book: 'Lk', chapter: 24, from: 44, to: 46 });
		expect(parseReference('1 Petr 2,25')).toEqual({ book: '1Petr', chapter: 2, from: 25, to: 25 });
		expect(parseReference('Dtn 18,15.18')).toEqual({ book: 'Dtn', chapter: 18, from: 15, to: 18 });
		expect(parseReference('1Kor 9,8.9.10')).toEqual({ book: '1Kor', chapter: 9, from: 8, to: 10 });
		expect(parseReference('Bar 3,9-4,4')).toEqual({ book: 'Bar', chapter: 3, from: 9, to: 4, toChapter: 4 });
		expect(parseReference('Dtn 31,14-34,12')).toEqual({ book: 'Dtn', chapter: 31, from: 14, to: 12, toChapter: 34 });
		expect(parseReference('Bar 4,9-3,4')).toBeNull();
		expect(parseReference('Anm. 3')).toBeNull();
	});

	it('takes the umlaut abbreviation and its keyboard spelling alike', () => {
		expect(canonSlug('Röm')).toBe('röm');
		expect(canonSlug('Roem')).toBe('röm');
		expect(canonSlug('ROEM')).toBe('röm');
		expect(canonSlug('1Koen')).toBe('1kön');
		expect(canonSlug('joh')).toBe('joh');
		expect(canonSlug('nope')).toBeNull();
		expect(parseReference('Roem 5,12')).toEqual({ book: 'Röm', chapter: 5, from: 12, to: 12 });
	});
});

describe('canon', () => {
	it('lists the 73 books in Vulgate order with names in all three languages', () => {
		expect(CANON_BY_TESTAMENT.ot.length + CANON_BY_TESTAMENT.nt.length).toBe(73);
		expect(CANON.joh).toMatchObject({ testament: 'nt', de: 'Johannes', en: 'John', la: 'Ioannes', tsv: 'Joh', drb: 'Jn' });
		expect(bookName('gen', 'en')).toBe('Genesis');
		expect(bookName('nope', 'de')).toBe('nope');
		const orders = Object.values(CANON).map((e) => e.order);
		expect(new Set(orders).size).toBe(orders.length);
	});
});

describe('allioli import', () => {
	it('reads one book or the whole dump and sorts by canonical number', () => {
		const john = { book: { name: 'Johannes', abbreviation: 'Joh', number: 51 }, chapters: [{ chapter: 1, verses: [{ verse: 1, text: { german: 'Im Anfange¹ war das Wort.' }, footnotes: [{ number: 1, text: 'Ehe etwas ward.' }] }] }] };
		const gen = { book: { name: 'Genesis', abbreviation: 'Gen', number: 1 }, chapters: [{ chapter: 1, verses: [] }] };
		expect(booksFromJson(JSON.stringify(john)).map((b) => b.book.abbreviation)).toEqual(['Joh']);
		expect(booksFromJson(JSON.stringify([john, gen])).map((b) => b.book.abbreviation)).toEqual(['Gen', 'Joh']);
		expect(() => booksFromJson('{"chapter": 1}')).toThrow(/not a book/);
	});

	it('the imported John has 21 chapters and its footnotes', () => {
		const file = path.resolve(__dirname, '../../../src/content/bible/allioli/joh.json');
		if (!existsSync(file)) return;
		const john = JSON.parse(readFileSync(file, 'utf-8'));
		expect(john.book.abbreviation).toBe('Joh');
		expect(john.chapters).toHaveLength(21);
		expect(john.chapters[2].verses.find((v: { verse: number }) => v.verse === 16).text.german).toMatch(/so sehr hat Gott die Welt/);
	});
});
