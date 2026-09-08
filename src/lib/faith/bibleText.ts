/**
 * Pure helpers for the Bible reader: the Allioli verse text carries its
 * footnote markers as superscript digits, and the footnotes carry
 * cross-references in square brackets. Both are turned into structured
 * segments here so the components only render.
 */
import { CANON, canonSlug } from './bibleCanon';

export type TextSegment =
	| { kind: 'text'; text: string }
	| { kind: 'marker'; number: number }
	/** `[Mt 3,1, Mk 1,2]` — parallel passages, printed in brackets in the verse. */
	| { kind: 'refs'; refs: string[] };

const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const SUP_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
const MARKER_OR_BRACKET = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\s*\[([^\]]+)\]/g;

export function supToInt(run: string): number {
	return Number([...run].map((c) => SUP[c] ?? '').join(''));
}

/**
 * Verse text → prose runs, footnote markers and bracketed parallel passages.
 * The brackets mostly close the verse ("… Johannes. [Mt 3,1, Mk 1,2]") but
 * sit mid-sentence in psalm headings and the genealogies, so they are cut
 * wherever they are.
 */
export function splitMarkers(text: string): TextSegment[] {
	const out: TextSegment[] = [];
	let last = 0;
	for (const m of text.matchAll(MARKER_OR_BRACKET)) {
		if (m.index! > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
		if (m[1] !== undefined) out.push({ kind: 'refs', refs: splitRefs(m[1]) });
		else out.push({ kind: 'marker', number: supToInt(m[0]) });
		last = m.index! + m[0].length;
	}
	if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
	return out;
}

/** Verse text without markers and brackets, for peeks, search results and meta text. */
export function stripMarkers(text: string): string {
	return text.replace(MARKER_OR_BRACKET, '').replace(/\s{2,}/g, ' ').trim();
}

export type NoteSegment =
	| { kind: 'text'; text: string }
	/** `[Gen 1,1]`, or an unbracketed "Offb 1,4" / "Psalm 23" — a reference into another (or the same) book. */
	| { kind: 'ref'; reference: string; label?: string }
	/** `V. 12`, `V. 3-12`, `Vers 5` — a verse or verse range of the chapter being read. */
	| { kind: 'verse'; verse: number; to?: number; label?: string }
	/** `Anm. 12`, `Anmerkung 3` — a footnote of the chapter being read; `[Mt 7,Anm.32.33]` — one of another chapter (`book`/`chapter` set). */
	| { kind: 'note'; number: number; to?: number; label: string; book?: string; chapter?: number };

/** Splits the content of one `[...]` group: "Gen 1,1, Spr 8,23" → two references; the introductions separate them with a full stop, "Mt 9,9. Mk 2,13ff. Lk 5,27ff.". */
const REF_PART = /[,.]\s*(?=\d?[A-ZÄÖÜ][a-zäöü]+\.?\s*\d)/;
export function splitRefs(group: string): string[] {
	return group.split(REF_PART).map((p) => p.trim()).filter(Boolean);
}

/**
 * A book named the way a footnote may name it: the reader's slug, an
 * abbreviation of either TSV, or the full name in any of the three
 * languages, plus the odd spellings the notes use ("Psalm", "Psalmen").
 */
const key = (n: string) => n.toLowerCase().replace(/[\s.]/g, '');
const BOOK_ABBRS: Record<string, string> = Object.fromEntries([
	...Object.entries(CANON).flatMap(([slug, e]) => [slug, e.tsv, e.drb].filter((n): n is string => !!n).map((n) => [key(n), slug])),
	['dt', 'dtn'], ['pred', 'koh'], ['is', 'jes']
]);
const BOOK_FULL_NAMES: Record<string, string> = Object.fromEntries([
	...Object.entries(CANON).flatMap(([slug, e]) => [e.de, e.en, e.la].map((n) => [key(n), slug])),
	['psalm', 'ps'], ['psalmen', 'ps'], ['psalms', 'ps'], ['prediger', 'koh'], ['isaias', 'jes']
]);
export function bookSlugFromName(name: string): string | null {
	return canonSlug(name) ?? BOOK_ABBRS[key(name)] ?? BOOK_FULL_NAMES[key(name)] ?? null;
}

// One `[…]` group, an in-chapter verse ("V. 12", "V. 3-12", "Vers 5", "Verse 24"),
// an in-chapter footnote ("Anm. 3", "Anmerkung 12", "Anm. 3-4", "Anm. 3 und 4"),
// or a bare reference ("Offb 1,4", "1 Petr 5,2-5", "Psalm 23", "Matthew 16:18").
// The footnote alternative comes before the book one: "Anm." looks like a
// book abbreviation followed by a chapter, and used to be tried as one.
const NOTE_LINK = /\[([^\]]+)\]|\b(?:V\.|Vers|Verse)\s?(\d+)(?:\s?[-–]\s?(\d+))?|\b(?:Anm\.?|Anmerkung(?:en)?)\s?(\d+)(?:\s?(?:[-–]|und|u\.)\s?(\d+))?(?!\d)|\b((?:[1-3]\s?)?[A-ZÄÖÜ][a-zäöü]+)\.?\s?(\d+(?:[,:]\s?\d+(?:\s?[-–]\s?\d+|(?:\.\d+)+)?(?:ff?)?)?)(?!\d)/g;
// A bracketed footnote of another chapter: "[Mt 7,Anm.32]", "[Mt 7,Anm.32.33]", "[1Makk 10,Anm.49]".
const NOTE_OF_CHAPTER = /^\s*((?:[1-3]\s?)?[A-ZÄÖÜ][a-zäöü]+)\.?\s*(\d+)\s*,\s*Anm\.?\s*(\d+)((?:\s?[.\-–]\s?\d+)*)\s*$/;

/** Footnote text → prose runs, references (bracketed or bare) and in-chapter verse links. */
export function noteSegments(text: string): NoteSegment[] {
	const out: NoteSegment[] = [];
	let last = 0;
	const push = (seg: NoteSegment, start: number, end: number) => {
		if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
		out.push(seg);
		last = end;
	};
	for (const m of text.matchAll(NOTE_LINK)) {
		const start = m.index!;
		const end = start + m[0].length;
		if (m[1] !== undefined) {
			const note = NOTE_OF_CHAPTER.exec(m[1]);
			const slug = note && bookSlugFromName(note[1].replace(/\s/g, ''));
			if (note && slug) {
				const numbers = [note[3], ...note[4].split(/\s?[.\-–]\s?/).filter(Boolean)].map(Number);
				push({ kind: 'note', number: numbers[0], to: numbers.length > 1 ? numbers[numbers.length - 1] : undefined, label: m[1].trim(), book: slug, chapter: Number(note[2]) }, start, end);
				continue;
			}
			if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
			splitRefs(m[1]).forEach((p, i) => {
				if (i > 0) out.push({ kind: 'text', text: ', ' });
				out.push({ kind: 'ref', reference: p });
			});
			last = end;
		} else if (m[2] !== undefined) {
			const verse = Number(m[2]);
			const to = m[3] !== undefined ? Number(m[3]) : undefined;
			push({ kind: 'verse', verse, to: to !== undefined && to > verse ? to : undefined, label: m[0] }, start, end);
		} else if (m[4] !== undefined) {
			const number = Number(m[4]);
			const to = m[5] !== undefined ? Number(m[5]) : undefined;
			push({ kind: 'note', number, to: to !== undefined && to > number ? to : undefined, label: m[0] }, start, end);
		} else if (m[6] !== undefined) {
			const name = m[6];
			const slug = bookSlugFromName(name);
			if (!slug) continue;
			// Prose has names followed by numbers too ("des Johannes 106 v. Chr.", "Am 5. Tage"):
			// a full name or a two-letter abbreviation counts only with a verse. Psalms are cited by number.
			const abbreviated = canonSlug(name) !== null || key(name) in BOOK_ABBRS;
			if (slug !== 'ps' && (!abbreviated || name.length <= 2) && !/[,:]/.test(m[7])) continue;
			push({ kind: 'ref', reference: `${name.replace(/\s/g, '')} ${m[7].replace(/\s/g, '')}`, label: m[0] }, start, end);
		}
	}
	if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
	return out;
}

export type ParsedReference = {
	book: string;
	chapter: number;
	/** Absent for a whole-chapter reference. */
	from?: number;
	to?: number;
	/** Set when the range runs into a later chapter ("Bar 3,9-4,4"): `to` is then a verse of that chapter. */
	toChapter?: number;
};

/**
 * "Gen 1,1", "Spr 8,22-31", "Weish 7", "Lk 24,44ff", "Dtn 18,15.18",
 * "1Kor 9,8.9.10", "Bar 3,9-4,4"; the English "Jn 2:1-5" and "1 Cor 13:1-13" too.
 */
export function parseReference(reference: string): ParsedReference | null {
	const span = reference.match(/^\s*(\d?\s?[A-ZÄÖÜ][a-zäöü]+)\.?\s*(\d+)[,:]\s*(\d+)\s*[-–]\s*(\d+)[,:]\s*(\d+)\s*$/);
	if (span) {
		const slug = bookSlugFromName(span[1].replace(/\s/g, ''));
		if (!slug) return null;
		const book = slug.replace(/[a-zäöü]/, (c) => c.toUpperCase());
		const chapter = Number(span[2]);
		const toChapter = Number(span[4]);
		if (toChapter <= chapter) return null;
		return { book, chapter, from: Number(span[3]), to: Number(span[5]), toChapter };
	}
	const m = reference.match(/^\s*(\d?\s?[A-ZÄÖÜ][a-zäöü]+)\.?\s*(\d+)(?:[,:]\s*(\d+)(?:\s*[-–]\s*(\d+)|((?:\.\d+)+))?(ff?)?\.?)?\s*$/);
	if (!m) return null;
	// "Anm. 3" and the like look like references but name no book.
	const slug = bookSlugFromName(m[1].replace(/\s/g, ''));
	if (!slug) return null;
	// The footnotes' own spelling, with umlauts, whatever was typed.
	const book = slug.replace(/[a-zäöü]/, (c) => c.toUpperCase());
	const chapter = Number(m[2]);
	if (m[3] === undefined) return { book, chapter };
	const from = Number(m[3]);
	let to = from;
	if (m[4]) to = Number(m[4]);
	else if (m[5]) to = Number(m[5].split('.').pop()); // "9,8.9.10" spans 8 to 10
	else if (m[6] === 'ff') to = from + 2;
	else if (m[6] === 'f') to = from + 1;
	return { book, chapter, from, to: Math.max(from, to) };
}

/** Reader URL: /glaube/bibel/joh/3 → the slug parts the route uses. */
export function bookSlug(abbreviation: string): string {
	return abbreviation.toLowerCase();
}
