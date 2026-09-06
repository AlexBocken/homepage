/**
 * Server side of the Bible reader.
 *
 * Books live in `src/content/bible/allioli/<slug>.json`, written by
 * `pnpm bible:import` from the `allioli` command: the 1914 Allioli German with
 * the Vulgate line per verse and the translator's footnotes, verse 0 of each
 * chapter being his introduction. `src/content/bible/drb/<slug>.json` holds
 * the Douay-Rheims text with Challoner's notes in the same shape (made once
 * by `scripts/transform-challoner.ts`). A chapter is the union of both by
 * verse number; cross-references resolve against the same files.
 */
import { promises as fs, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseReference, stripMarkers } from '$lib/faith/bibleText';
import { canonEntry, canonSlug, type CanonEntry } from '$lib/faith/bibleCanon';

const CONTENT_DIR = path.resolve('src', 'content', 'bible', 'allioli');
const DRB_DIR = path.resolve('src', 'content', 'bible', 'drb');

export type Footnote = { number: number; text: string };
export type StoredVerse = { verse: number; text: { latin?: string; german: string }; footnotes?: Footnote[] };
export type StoredChapter = { chapter: number; verses: StoredVerse[] };
export type StoredBook = { book: { name: string; abbreviation: string; number: number }; chapters: StoredChapter[] };

export type StoredDrbVerse = { verse: number; text: { english: string }; footnotes?: Footnote[] };
export type StoredDrbBook = {
	book: { name: string; abbreviation: string; number: number; introduction: { title: string; text: string } | null };
	chapters: { chapter: number; verses: StoredDrbVerse[] }[];
};

const bookCache = new Map<string, StoredBook | null>();
const drbCache = new Map<string, StoredDrbBook | null>();

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
	/** Empty when only the Douay-Rheims has the verse (the Greek Esther, say). */
	german: string;
	latin: string | null;
	english: string | null;
	/** Allioli's notes. */
	footnotes: Footnote[];
	/** Challoner's notes. */
	footnotesEn: Footnote[];
};

export type ReaderChapter = {
	book: { slug: string; name: string; abbreviation: string; chapters: number; canon: CanonEntry | null };
	chapter: number;
	/** Allioli's introduction to the chapter (verse 0). */
	intro: string | null;
	/** Challoner's chapter summary. */
	introEn: string | null;
	/** Challoner's introduction to the book, on its first chapter. */
	bookIntro: { title: string; text: string } | null;
	verses: ReaderVerse[];
	/** Which primary texts exist for this chapter. */
	has: { latin: boolean; english: boolean };
};

export async function loadDrb(slug: string): Promise<StoredDrbBook | null> {
	const key = canonSlug(slug) ?? slug.toLowerCase();
	if (drbCache.has(key)) return drbCache.get(key)!;
	let book: StoredDrbBook | null = null;
	try {
		book = JSON.parse(await fs.readFile(path.join(DRB_DIR, `${key}.json`), 'utf-8')) as StoredDrbBook;
	} catch {
		book = null;
	}
	drbCache.set(key, book);
	return book;
}

export async function loadChapter(slug: string, chapter: number): Promise<ReaderChapter | null> {
	const [book, drb] = await Promise.all([loadBook(slug), loadDrb(slug)]);
	if (!book && !drb) return null;
	const de = book?.chapters.find((c) => c.chapter === chapter);
	const en = drb?.chapters.find((c) => c.chapter === chapter);
	if (!de && !en) return null;
	const deByVerse = new Map((de?.verses ?? []).map((v) => [v.verse, v]));
	const enByVerse = new Map((en?.verses ?? []).map((v) => [v.verse, v]));
	// Verse 0 is the translator's introduction; the rest in numeric order,
	// whichever text has them. Unnumbered lines (the Hebrew letter headings in
	// Lamentations) are skipped.
	const numbers = [...new Set([...deByVerse.keys(), ...enByVerse.keys()])].filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
	const verses: ReaderVerse[] = numbers.map((n) => {
		const d = deByVerse.get(n);
		const e = enByVerse.get(n);
		return {
			verse: n,
			german: d?.text.german ?? '',
			latin: d?.text.latin ?? null,
			english: e?.text.english ?? null,
			footnotes: d?.footnotes ?? [],
			footnotesEn: e?.footnotes ?? []
		};
	});
	const meta = book?.book ?? drb!.book;
	return {
		book: {
			slug: canonSlug(slug) ?? slug.toLowerCase(),
			name: meta.name,
			abbreviation: meta.abbreviation,
			chapters: Math.max(book?.chapters.length ?? 0, drb?.chapters.length ?? 0),
			canon: canonEntry(slug)
		},
		chapter,
		intro: deByVerse.get(0)?.text.german ?? null,
		introEn: enByVerse.get(0)?.text.english ?? null,
		bookIntro: chapter === 1 ? (drb?.book.introduction ?? null) : null,
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
 * passage, in Allioli's German or, for the English reader, the Douay-Rheims.
 * `null` when neither text has the chapter.
 */
export async function resolveReference(reference: string, lang: 'de' | 'en' = 'de'): Promise<Passage | null> {
	const parsed = parseReference(reference);
	if (!parsed) return null;
	const slug = canonSlug(parsed.book) ?? parsed.book.toLowerCase();
	let inChapter: { verse: number; text: string }[] = [];
	if (lang === 'en') {
		const ch = (await loadDrb(slug))?.chapters.find((c) => c.chapter === parsed.chapter);
		if (ch) inChapter = ch.verses.filter((v) => v.verse > 0).map((v) => ({ verse: v.verse, text: stripMarkers(v.text.english) }));
	}
	if (inChapter.length === 0) {
		const ch = (await loadBook(slug))?.chapters.find((c) => c.chapter === parsed.chapter);
		if (ch) inChapter = ch.verses.filter((v) => Number.isInteger(v.verse) && v.verse > 0).map((v) => ({ verse: v.verse, text: stripMarkers(v.text.german) }));
	}
	if (inChapter.length === 0) return null;
	const entry = canonEntry(slug);
	const name = (lang === 'en' ? entry?.en : entry?.de) ?? parsed.book;
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
	return { label, slug: availableBooks().includes(slug) ? slug : null, chapter: parsed.chapter, verses: picked, more };
}

export type SearchHit = { chapter: number; verse: number; text: string };

/** Plain substring search through one book, in Allioli's German or the Douay-Rheims. */
export async function searchBook(slug: string, query: string, lang: 'de' | 'en' = 'de', limit = 40): Promise<SearchHit[]> {
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];
	const chapters: { chapter: number; verses: { verse: number; text: string }[] }[] =
		lang === 'en'
			? ((await loadDrb(slug))?.chapters ?? []).map((c) => ({ chapter: c.chapter, verses: c.verses.map((v) => ({ verse: v.verse, text: v.text.english })) }))
			: ((await loadBook(slug))?.chapters ?? []).map((c) => ({ chapter: c.chapter, verses: c.verses.map((v) => ({ verse: v.verse, text: v.text.german })) }));
	const hits: SearchHit[] = [];
	for (const ch of chapters) {
		for (const v of ch.verses) {
			if (!Number.isInteger(v.verse) || v.verse === 0) continue;
			if (v.text.toLowerCase().includes(q)) {
				hits.push({ chapter: ch.chapter, verse: v.verse, text: stripMarkers(v.text) });
				if (hits.length >= limit) return hits;
			}
		}
	}
	return hits;
}

/** Synchronous variant for the index page and sitemap: name + chapter count per book. */
export function bookSummary(slug: string): { slug: string; name: string; chapters: number } | null {
	try {
		const raw = JSON.parse(readFileSync(path.join(CONTENT_DIR, `${slug}.json`), 'utf-8')) as StoredBook;
		let chapters = raw.chapters.length;
		try {
			// The Douay-Rheims has more chapters in Esther; the reader serves them all.
			const drb = JSON.parse(readFileSync(path.join(DRB_DIR, `${slug}.json`), 'utf-8')) as StoredDrbBook;
			chapters = Math.max(chapters, drb.chapters.length);
		} catch {
			// no English file
		}
		return { slug, name: raw.book.name, chapters };
	} catch {
		return null;
	}
}
