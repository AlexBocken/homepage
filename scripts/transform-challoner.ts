/**
 * One-off: turn `douay_rheims_challoner.json` (the Douay-Rheims text with
 * Bishop Challoner's notes, one array of books) into
 * `src/content/bible/drb/<slug>.json`, one file per book in the shape the
 * Allioli files have, so the reader needs one footnote parser for both.
 *
 * What it normalises, in Allioli's notation:
 *   - Footnote markers. Challoner's notes only name the verse; each opens
 *     with the lemma it comments ("Two great lights...."). The lemma is
 *     located in the verse and a superscript number goes right after it
 *     (after the verse's last word when it can't be found).
 *   - Cross-references. Bare "Joh 5,17" / "1. Kor 9,8" / "1 Chron. or
 *     Paralip. 21,1" become "[Joh 5,17]" / "[1Kor 9,8]" / "[1Chr 21,1]", and
 *     "ver. 22" becomes "V. 22", which the note parser links in-chapter.
 *   - Stray spaces before punctuation (" ,", " .") that the source carries.
 *   - Chapter 0 is Challoner's introduction to the book, its verses the
 *     paragraphs (the first the title), kept as Allioli's files keep his.
 *
 * The output is committed; this script is kept as the record of how it was
 * made and is not part of any build step.
 *
 *   pnpm exec vite-node scripts/transform-challoner.ts [path/to/douay_rheims_challoner.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { CANON, canonSlug } from '../src/lib/faith/bibleCanon';

type SrcNote = { number: number; ref: string; text: string };
type SrcVerse = { verse: number; text: { english: string }; footnotes?: SrcNote[] };
type SrcBook = {
	book: { name: string; abbreviation: string; number: number; kbibel_abbr: string };
	chapters: { chapter: number; verses: SrcVerse[] }[];
};

const ROOT = path.resolve(process.cwd());
const IN = path.resolve(process.argv[2] ?? 'douay_rheims_challoner.json');
const OUT_DIR = path.join(ROOT, 'src', 'content', 'bible', 'drb');

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n: number) => String(n).split('').map((d) => SUP[Number(d)]).join('');

/* ---------- markers ---------- */

/** Letters only, with a map from each kept character back to its source index. */
function skeleton(text: string): { s: string; at: number[] } {
	let s = '';
	const at: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const c = text[i].toLowerCase();
		if (/[a-z]/.test(c)) {
			s += c;
			at.push(i);
		}
	}
	return { s, at };
}

/** Index in `verse` just past the lemma the note opens with, or null. */
function lemmaEnd(verse: string, note: string): number | null {
	const m = note.match(/^(.*?)\.{3,}/);
	if (!m) return null;
	const lemma = m[1].replace(/,?\s*etc\.?\s*$/i, '').trim();
	const want = skeleton(lemma).s;
	if (want.length < 3) return null;
	const have = skeleton(verse);
	let used = want;
	let i = have.s.indexOf(want);
	// Long lemmas are sometimes paraphrased at the end; the first words suffice.
	if (i < 0 && want.length > 14) {
		used = want.slice(0, 14);
		i = have.s.indexOf(used);
	}
	if (i < 0) return null;
	const lastLetter = have.at[i + used.length - 1];
	// Past the word the lemma ends in, and past a comma or full stop that follows.
	let end = lastLetter + 1;
	while (end < verse.length && /[a-zA-Z'’]/.test(verse[end])) end++;
	if (end < verse.length && /[,.;:!?]/.test(verse[end])) end++;
	return end;
}

let placed = 0;
let appended = 0;

function markVerse(text: string, notes: SrcNote[]): string {
	// Insert from the back so earlier indices stay valid.
	const spots = notes.map((n) => {
		const end = lemmaEnd(text, n.text);
		if (end === null) appended++;
		else placed++;
		return { n: n.number, end: end ?? text.replace(/\s+$/, '').length };
	});
	spots.sort((a, b) => b.end - a.end || b.n - a.n);
	let out = text;
	for (const { n, end } of spots) out = out.slice(0, end) + sup(n) + out.slice(end);
	return out;
}

/* ---------- references ---------- */

// Spellings Challoner uses that are not the canon's German abbreviations.
const ALIASES: Record<string, string> = {
	Chron: 'Chr',
	Paralip: 'Chr',
	Cor: 'Kor',
	Machabees: 'Makk',
	Mac: 'Makk',
	Matt: 'Mt',
	Mark: 'Mk',
	Luke: 'Lk',
	John: 'Joh',
	Acts: 'Apg',
	Heb: 'Hebr',
	Psalm: 'Ps',
	Psalms: 'Ps'
};
// Only these book names count, so "See 1 Sam 19,20" is not read as "See 1".
const NAMES = [...new Set([...Object.keys(CANON).map((k) => k.replace(/^\d/, '').replace(/^./, (c) => c.toUpperCase())), ...Object.keys(ALIASES)])]
	.sort((a, b) => b.length - a.length)
	.join('|');

// "1. Kor 9,8.9.10", "1 Chron. or Paralip. 21,1", "Joh 5,17", "Ps 118,142", "Paralip. 11"
const REF = new RegExp(`(?<![\\[\\w])(?:(\\d)\\.?\\s?)?(${NAMES})\\.?(?:\\s+or\\s+Paralip\\.)?\\s(\\d+)(?:,\\s?(\\d+(?:[.\\-–]\\d+)*))?(?=\\s?[.,;:)]|\\s|$)`, 'g');

let refsWrapped = 0;
let refsSkipped: string[] = [];

function bracketRefs(text: string): string {
	let out = text.replace(REF, (whole, num: string | undefined, name: string, ch: string, verses: string | undefined) => {
		const abbr = (num ?? '') + (ALIASES[name] ?? name);
		if (!canonSlug(abbr)) {
			refsSkipped.push(whole.trim());
			return whole;
		}
		refsWrapped++;
		return `[${abbr} ${ch}${verses ? `,${verses}` : ''}]`;
	});
	// "ver. 22" → "V. 22" (the parser's in-chapter verse link).
	out = out.replace(/\b[Vv]er\.\s?(\d+)/g, 'V. $1');
	// The source leaves a space before punctuation after references.
	out = out.replace(/\s+([,.;:])/g, '$1').replace(/\]([A-Za-z])/g, '] $1');
	return out;
}

/* ---------- run ---------- */

const books = JSON.parse(readFileSync(IN, 'utf-8')) as SrcBook[];
mkdirSync(OUT_DIR, { recursive: true });
let notes = 0;
for (const b of books) {
	const slug = canonSlug(b.book.kbibel_abbr);
	if (!slug) throw new Error(`${b.book.kbibel_abbr}: not in the canon`);
	const chapters = b.chapters.map((c) => ({
		chapter: c.chapter,
		verses: c.verses.map((v) => {
			const fns = v.footnotes ?? [];
			notes += fns.length;
			// The introduction's paragraphs cite bare references in their prose ("( Lk 5,27 , and Mk 2,14 .)"); bracketed, the reader links them.
			const text = c.chapter === 0 ? bracketRefs(v.text.english) : v.text.english;
			const out: { verse: number; text: { english: string }; footnotes?: { number: number; text: string }[] } = {
				verse: v.verse,
				text: { english: fns.length && v.verse > 0 ? markVerse(text, fns) : text }
			};
			if (fns.length) out.footnotes = fns.map((f) => ({ number: f.number, text: bracketRefs(f.text) }));
			return out;
		})
	}));
	const file = path.join(OUT_DIR, `${slug}.json`);
	writeFileSync(
		file,
		JSON.stringify({
			book: { name: b.book.name, abbreviation: b.book.abbreviation, number: b.book.number },
			chapters
		})
	);
}
console.log(`[challoner] ${books.length} books, ${notes} notes: ${placed} markers at the lemma, ${appended} at the verse end`);
console.log(`[challoner] ${refsWrapped} references bracketed, ${refsSkipped.length} left alone${refsSkipped.length ? ': ' + [...new Set(refsSkipped)].join(' | ') : ''}`);
