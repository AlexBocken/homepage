/**
 * Server side of the Bible reader.
 *
 * Books live in `src/content/bible/allioli/<abbr>.json`, written by
 * `pnpm bible:import` from the `allioli` command: the 1914 Allioli German with
 * the Vulgate line per verse and the translator's footnotes, verse 0 of each
 * chapter being his introduction. The Douay-Rheims text comes from
 * `static/drb.tsv`, cross-references in footnotes are resolved against
 * `static/allioli.tsv` (the whole Allioli text without notes).
 */
import { promises as fs, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadVersesFromFile } from './bible';
import { resolveStaticAsset } from './staticAsset';
import { FOOTNOTE_TO_TSV, parseReference, stripMarkers } from '$lib/faith/bibleText';
import { canonEntry, canonSlug, type CanonEntry } from '$lib/faith/bibleCanon';

const CONTENT_DIR = path.resolve('src', 'content', 'bible', 'allioli');

export type Footnote = { number: number; text: string };
export type StoredVerse = { verse: number; text: { latin?: string; german: string }; footnotes?: Footnote[] };
export type StoredChapter = { chapter: number; verses: StoredVerse[] };
export type StoredBook = { book: { name: string; abbreviation: string; number: number }; chapters: StoredChapter[] };

const bookCache = new Map<string, StoredBook | null>();

/** Slugs (lower-case abbreviations) of the books that have been imported. */
export function availableBooks(): string[] {
	try {
		return readdirSync(CONTENT_DIR)
			.filter((f) => f.endsWith('.json'))
			.map((f) => f.replace(/\.json$/, ''))
			.sort((a, b) => (canonEntry(a)?.order ?? 999) - (canonEntry(b)?.order ?? 999));
	} catch {
		return [];
	}
}

export async function loadBook(slug: string): Promise<StoredBook | null> {
	const key = canonSlug(slug) ?? slug.toLowerCase();
	if (bookCache.has(key)) return bookCache.get(key)!;
	let book: StoredBook | null = null;
	try {
		book = JSON.parse(await fs.readFile(path.join(CONTENT_DIR, `${key}.json`), 'utf-8')) as StoredBook;
	} catch {
		book = null;
	}
	bookCache.set(key, book);
	return book;
}

export type ReaderVerse = {
	verse: number;
	german: string;
	latin: string | null;
	english: string | null;
	footnotes: Footnote[];
};

export type ReaderChapter = {
	book: { slug: string; name: string; abbreviation: string; chapters: number; canon: CanonEntry | null };
	chapter: number;
	intro: string | null;
	verses: ReaderVerse[];
	/** Which primary texts exist for this chapter. */
	has: { latin: boolean; english: boolean };
};

const drbBySlug = new Map<string, Map<number, Map<number, string>>>();

/** Douay-Rheims text of a book, keyed chapter → verse, from `drb.tsv`. */
function drbBook(slug: string): Map<number, Map<number, string>> {
	const cached = drbBySlug.get(slug);
	if (cached) return cached;
	const entry = canonEntry(slug);
	const out = new Map<number, Map<number, string>>();
	if (entry?.drb) {
		for (const v of loadVersesFromFile(resolveStaticAsset('drb.tsv'))) {
			if (v.abbreviation !== entry.drb) continue;
			if (!out.has(v.chapter)) out.set(v.chapter, new Map());
			out.get(v.chapter)!.set(v.verseNumber, v.text);
		}
	}
	drbBySlug.set(slug, out);
	return out;
}

export async function loadChapter(slug: string, chapter: number): Promise<ReaderChapter | null> {
	const book = await loadBook(slug);
	if (!book) return null;
	const ch = book.chapters.find((c) => c.chapter === chapter);
	if (!ch) return null;
	const en = drbBook(slug).get(chapter);
	const intro = ch.verses.find((v) => v.verse === 0)?.text.german ?? null;
	const verses: ReaderVerse[] = ch.verses
		.filter((v) => v.verse > 0)
		.map((v) => ({
			verse: v.verse,
			german: v.text.german,
			latin: v.text.latin ?? null,
			english: en?.get(v.verse) ?? null,
			footnotes: v.footnotes ?? []
		}));
	return {
		book: {
			slug: canonSlug(slug) ?? slug.toLowerCase(),
			name: book.book.name,
			abbreviation: book.book.abbreviation,
			chapters: book.chapters.length,
			canon: canonEntry(slug)
		},
		chapter,
		intro,
		verses,
		has: { latin: verses.some((v) => v.latin), english: verses.some((v) => v.english) }
	};
}

export type Passage = {
	label: string;
	/** Reader slug when the book is importable in the reader, for "go there". */
	slug: string | null;
	chapter: number;
	verses: { verse: number; text: string }[];
	more: boolean;
};

const PEEK_MAX_VERSES = 8;
const CHAPTER_PEEK_VERSES = 6;

/**
 * A footnote reference ("Gen 1,1", "Spr 8,22-31", "Weish 7") as a short
 * passage. Read from the imported book when there is one (that also covers
 * the deuterocanonical books), else from `allioli.tsv`; `null` when neither
 * has the chapter.
 */
export async function resolveReference(reference: string): Promise<Passage | null> {
	const parsed = parseReference(reference);
	if (!parsed) return null;
	const slug = canonSlug(parsed.book) ?? parsed.book.toLowerCase();
	const book = await loadBook(slug);
	let inChapter: { verse: number; text: string }[];
	if (book) {
		const ch = book.chapters.find((c) => c.chapter === parsed.chapter);
		inChapter = (ch?.verses ?? []).filter((v) => v.verse > 0).map((v) => ({ verse: v.verse, text: stripMarkers(v.text.german) }));
	} else {
		const tsvAbbr = FOOTNOTE_TO_TSV[parsed.book] ?? parsed.book;
		inChapter = loadVersesFromFile(resolveStaticAsset('allioli.tsv'))
			.filter((v) => v.abbreviation === tsvAbbr && v.chapter === parsed.chapter)
			.map((v) => ({ verse: v.verseNumber, text: v.text }));
	}
	if (inChapter.length === 0) return null;
	// The canon's name, not the TSV's Protestant one ("Genesis", not "1 Mose").
	const name = canonEntry(slug)?.de ?? parsed.book;
	let picked: { verse: number; text: string }[];
	let more = false;
	let label: string;
	if (parsed.from === undefined) {
		picked = inChapter.slice(0, CHAPTER_PEEK_VERSES);
		more = inChapter.length > picked.length;
		label = `${name} ${parsed.chapter}`;
	} else {
		const to = Math.min(parsed.to ?? parsed.from, parsed.from + PEEK_MAX_VERSES - 1);
		picked = inChapter.filter((v) => v.verse >= parsed.from! && v.verse <= to);
		more = (parsed.to ?? parsed.from) > to;
		label = `${name} ${parsed.chapter},${parsed.from}${to > parsed.from ? `–${to}` : ''}`;
	}
	return { label, slug: book ? slug : null, chapter: parsed.chapter, verses: picked, more };
}

export type SearchHit = { chapter: number; verse: number; text: string };

/** Plain substring search through one book's German text. */
export async function searchBook(slug: string, query: string, limit = 40): Promise<SearchHit[]> {
	const book = await loadBook(slug);
	if (!book) return [];
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];
	const hits: SearchHit[] = [];
	for (const ch of book.chapters) {
		for (const v of ch.verses) {
			if (v.verse === 0) continue;
			if (v.text.german.toLowerCase().includes(q)) {
				hits.push({ chapter: ch.chapter, verse: v.verse, text: stripMarkers(v.text.german) });
				if (hits.length >= limit) return hits;
			}
		}
	}
	return hits;
}

/** Synchronous variant for the index page: name + chapter count per book. */
export function bookSummary(slug: string): { slug: string; name: string; chapters: number } | null {
	try {
		const raw = JSON.parse(readFileSync(path.join(CONTENT_DIR, `${slug}.json`), 'utf-8')) as StoredBook;
		return { slug, name: raw.book.name, chapters: raw.chapters.length };
	} catch {
		return null;
	}
}
