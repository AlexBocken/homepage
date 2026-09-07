/**
 * Pure helpers for the Bible reader: the Allioli verse text carries its
 * footnote markers as superscript digits, and the footnotes carry
 * cross-references in square brackets. Both are turned into structured
 * segments here so the components only render.
 */
import { canonSlug } from './bibleCanon';

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
	/** `[Gen 1,1]` — a reference into another (or the same) book. */
	| { kind: 'ref'; reference: string }
	/** `V. 12` — a verse of the chapter being read. */
	| { kind: 'verse'; verse: number };

/** Splits the content of one `[...]` group: "Gen 1,1, Spr 8,23" → two references. */
const REF_PART = /,\s*(?=\d?[A-ZÄÖÜ][a-zäöü]+\.?\s*\d)/;
export function splitRefs(group: string): string[] {
	return group.split(REF_PART).map((p) => p.trim()).filter(Boolean);
}
const BRACKET_OR_VERSE = /\[([^\]]+)\]|\bV\.\s?(\d+)/g;

/** Footnote text → prose runs, bracket references and in-chapter verse links. */
export function noteSegments(text: string): NoteSegment[] {
	const out: NoteSegment[] = [];
	let last = 0;
	for (const m of text.matchAll(BRACKET_OR_VERSE)) {
		if (m.index! > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
		if (m[1] !== undefined) {
			splitRefs(m[1]).forEach((p, i) => {
				if (i > 0) out.push({ kind: 'text', text: ', ' });
				out.push({ kind: 'ref', reference: p });
			});
		} else {
			out.push({ kind: 'verse', verse: Number(m[2]) });
		}
		last = m.index! + m[0].length;
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
		const slug = canonSlug(span[1].replace(/\s/g, ''));
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
	const slug = canonSlug(m[1].replace(/\s/g, ''));
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
