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
import { parseReference, stripMarkers } from '$lib/faith/bibleText';
import { canonEntry, canonSlug, foldUmlauts, type CanonEntry } from '$lib/faith/bibleCanon';
import { building } from '$app/environment';
import { chapterCount } from '$lib/faith/readingPlan';

// The books are bundled into the server build as lazy JSON chunks, one per
// book, so production needs no `src/content` on disk (deploy ships `build/`
// only). Keys are the source paths; a book loads on first use and stays cached.
const ALLIOLI_FILES = import.meta.glob<StoredBook>('/src/content/bible/allioli/*.json', { import: 'default' });
const DRB_FILES = import.meta.glob<StoredDrbBook>('/src/content/bible/drb/*.json', { import: 'default' });
const slugOfPath = (p: string) => decodeURIComponent(p.replace(/^.*\//, '').replace(/\.json$/, ''));
const ALLIOLI_BY_SLUG = new Map(Object.entries(ALLIOLI_FILES).map(([p, load]) => [slugOfPath(p), load]));
const DRB_BY_SLUG = new Map(Object.entries(DRB_FILES).map(([p, load]) => [slugOfPath(p), load]));

export type Footnote = { number: number; text: string };
export type StoredVerse = { verse: number; text: { latin?: string; german: string }; footnotes?: Footnote[] };
export type StoredChapter = { chapter: number; verses: StoredVerse[] };
export type StoredBook = { book: { name: string; abbreviation: string; number: number }; chapters: StoredChapter[] };

export type StoredDrbVerse = { verse: number; text: { english: string }; footnotes?: Footnote[] };
export type StoredDrbBook = {
	book: { name: string; abbreviation: string; number: number };
	/** Chapter 0 is Challoner's introduction to the book, as chapter 0 is Allioli's. */
	chapters: { chapter: number; verses: StoredDrbVerse[] }[];
};

const bookCache = new Map<string, StoredBook | null>();
const drbCache = new Map<string, StoredDrbBook | null>();

/** Slugs of the books that have been imported, in canon order. */
export function availableBooks(): string[] {
	return [...ALLIOLI_BY_SLUG.keys()].sort((a, b) => (canonEntry(a)?.order ?? 999) - (canonEntry(b)?.order ?? 999));
}

export async function loadBook(slug: string): Promise<StoredBook | null> {
	const key = canonSlug(slug) ?? slug.toLowerCase();
	if (bookCache.has(key)) return bookCache.get(key)!;
	let book: StoredBook | null = null;
	try {
		const load = ALLIOLI_BY_SLUG.get(key);
		book = load ? await load() : null;
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
	verses: ReaderVerse[];
	/** Which primary texts exist for this chapter. */
	has: { latin: boolean; english: boolean };
};

export async function loadDrb(slug: string): Promise<StoredDrbBook | null> {
	const key = canonSlug(slug) ?? slug.toLowerCase();
	if (drbCache.has(key)) return drbCache.get(key)!;
	let book: StoredDrbBook | null = null;
	try {
		const load = DRB_BY_SLUG.get(key);
		book = load ? await load() : null;
	} catch {
		book = null;
	}
	drbCache.set(key, book);
	return book;
}

/** Chapter 0, when a file has it, is the book's introduction and not a chapter. */
const countChapters = (book: StoredBook | null, drb: StoredDrbBook | null) =>
	Math.max(book?.chapters.filter((c) => c.chapter > 0).length ?? 0, drb?.chapters.filter((c) => c.chapter > 0).length ?? 0);

/** One paragraph of an introduction, numbered like a verse, with its notes; the first is the title. */
export type IntroParagraph = { n: number; text: string; footnotes: Footnote[] };
export type BookPage = {
	book: ReaderChapter['book'];
	/** Allioli's and Challoner's introductions to the book, chapter 0 of their files. */
	intro: { de: IntroParagraph[] | null; en: IntroParagraph[] | null };
	has: { latin: boolean; english: boolean };
};

/** The book's own page: its introductions, for the route without a chapter. */
export async function loadBookPage(slug: string): Promise<BookPage | null> {
	const [book, drb] = await Promise.all([loadBook(slug), loadDrb(slug)]);
	if (!book && !drb) return null;
	const meta = book?.book ?? drb!.book;
	const de = book?.chapters.find((c) => c.chapter === 0);
	const en = drb?.chapters.find((c) => c.chapter === 0);
	const first = book?.chapters.find((c) => c.chapter === 1);
	return {
		book: { slug: canonSlug(slug) ?? slug.toLowerCase(), name: meta.name, abbreviation: meta.abbreviation, chapters: countChapters(book, drb), canon: canonEntry(slug) },
		intro: {
			de: de?.verses.length ? de.verses.map((v) => ({ n: v.verse, text: v.text.german, footnotes: v.footnotes ?? [] })) : null,
			en: en?.verses.length ? en.verses.map((v) => ({ n: v.verse, text: v.text.english, footnotes: v.footnotes ?? [] })) : null
		},
		has: { latin: !!first?.verses.some((v) => v.text.latin), english: !!drb }
	};
}

export async function loadChapter(slug: string, chapter: number): Promise<ReaderChapter | null> {
	if (chapter < 1) return null;
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
			chapters: countChapters(book, drb),
			canon: canonEntry(slug)
		},
		chapter,
		intro: deByVerse.get(0)?.text.german ?? null,
		introEn: enByVerse.get(0)?.text.english ?? null,
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
 * passage, in Allioli's German, the Douay-Rheims for the English reader or
 * the Vulgate for the Latin one, and named as that reader names the book.
 * `null` when no text has the chapter.
 */
export async function resolveReference(reference: string, lang: 'de' | 'en' | 'la' = 'de'): Promise<Passage | null> {
	const parsed = parseReference(reference);
	if (!parsed) return null;
	const slug = canonSlug(parsed.book) ?? parsed.book.toLowerCase();
	// The verses of one chapter, in the reader's language when it has them.
	const chapterVerses = async (chapter: number): Promise<{ verse: number; text: string }[]> => {
		if (lang === 'en') {
			const ch = (await loadDrb(slug))?.chapters.find((c) => c.chapter === chapter);
			if (ch) return ch.verses.filter((v) => v.verse > 0).map((v) => ({ verse: v.verse, text: stripMarkers(v.text.english) }));
		}
		const ch = (await loadBook(slug))?.chapters.find((c) => c.chapter === chapter);
		if (!ch) return [];
		const verses = ch.verses.filter((v) => Number.isInteger(v.verse) && v.verse > 0);
		// The Vulgate is in the same file; a chapter it lacks falls back to Allioli.
		if (lang === 'la' && verses.every((v) => v.text.latin)) return verses.map((v) => ({ verse: v.verse, text: stripMarkers(v.text.latin!) }));
		return verses.map((v) => ({ verse: v.verse, text: stripMarkers(v.text.german) }));
	};
	const inChapter = await chapterVerses(parsed.chapter);
	if (inChapter.length === 0) return null;
	const entry = canonEntry(slug);
	const name = entry?.[lang] ?? parsed.book;
	let picked: { verse: number; text: string }[];
	let more = false;
	let label: string;
	if (parsed.toChapter !== undefined && parsed.from !== undefined) {
		// A range into a later chapter: the first chapter's tail, then the next
		// chapters up to the last verse, a few verses at most.
		const all: { verse: number; text: string }[] = inChapter.filter((v) => v.verse >= parsed.from!);
		for (let c = parsed.chapter + 1; c <= parsed.toChapter && all.length < PEEK_MAX_VERSES; c++) {
			const vs = await chapterVerses(c);
			all.push(...(c === parsed.toChapter ? vs.filter((v) => v.verse <= parsed.to!) : vs));
		}
		picked = all.slice(0, PEEK_MAX_VERSES);
		more = all.length > picked.length || parsed.toChapter - parsed.chapter > 1;
		label = `${name} ${parsed.chapter},${parsed.from}–${parsed.toChapter},${parsed.to}`;
	} else if (parsed.from === undefined) {
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

export type SearchHit = { chapter: number; verse: number; text: string; /** Set when the hit comes from a search across books. */ book?: string };

/**
 * The search index: every verse of a translation as one flat entry, text
 * with the markers stripped and a folded copy to match against — lower
 * case, umlauts as a plain keyboard types them — so a query is one pass of
 * `includes` over some thirty thousand short strings, a few milliseconds.
 * Built once per language, from the books in canon order, and warmed when
 * the server starts: the first build parses every book, which took the
 * first whole-Bible search of a fresh process six seconds.
 */
type IndexEntry = { book: string; chapter: number; verse: number; text: string; folded: string };
const foldQuery = (q: string) => foldUmlauts(q.trim());
const indexes = new Map<'de' | 'en', Promise<IndexEntry[]>>();
function searchIndex(lang: 'de' | 'en'): Promise<IndexEntry[]> {
	let p = indexes.get(lang);
	if (!p) {
		p = (async () => {
			const out: IndexEntry[] = [];
			for (const slug of availableBooks()) {
				const chapters: { chapter: number; verses: { verse: number; text: string }[] }[] =
					lang === 'en'
						? ((await loadDrb(slug))?.chapters ?? []).map((c) => ({ chapter: c.chapter, verses: c.verses.map((v) => ({ verse: v.verse, text: v.text.english })) }))
						: ((await loadBook(slug))?.chapters ?? []).map((c) => ({ chapter: c.chapter, verses: c.verses.map((v) => ({ verse: v.verse, text: v.text.german })) }));
				for (const ch of chapters) {
					if (ch.chapter === 0) continue;
					for (const v of ch.verses) {
						if (!Number.isInteger(v.verse) || v.verse === 0 || !v.text) continue;
						const text = stripMarkers(v.text);
						out.push({ book: slug, chapter: ch.chapter, verse: v.verse, text, folded: foldUmlauts(text) });
					}
				}
			}
			return out;
		})();
		indexes.set(lang, p);
	}
	return p;
}
// Warm both at startup, off any request. Not while building, when the
// module is evaluated for prerendering, nor under vite-node, where a
// script such as the Allioli import would parse every book for nothing.
const warm = !building && !process.argv[1]?.includes('vite-node');
if (warm) for (const lang of ['de', 'en'] as const) void searchIndex(lang).catch(() => indexes.delete(lang));

/** Substring search through one book, in Allioli's German or the Douay-Rheims; case and umlauts do not matter. */
export async function searchBook(slug: string, query: string, lang: 'de' | 'en' = 'de', limit = 40): Promise<SearchHit[]> {
	const q = foldQuery(query);
	if (q.length < 2) return [];
	const hits: SearchHit[] = [];
	for (const e of await searchIndex(lang)) {
		if (e.book !== slug || !e.folded.includes(q)) continue;
		hits.push({ chapter: e.chapter, verse: e.verse, text: e.text });
		if (hits.length >= limit) break;
	}
	return hits;
}

/** The same search over every book, canon order, `limit` hits in all; each hit names its book. */
export async function searchBible(query: string, lang: 'de' | 'en' = 'de', limit = 60): Promise<SearchHit[]> {
	const q = foldQuery(query);
	if (q.length < 2) return [];
	const hits: SearchHit[] = [];
	for (const e of await searchIndex(lang)) {
		if (!e.folded.includes(q)) continue;
		hits.push({ book: e.book, chapter: e.chapter, verse: e.verse, text: e.text });
		if (hits.length >= limit) break;
	}
	return hits;
}

/**
 * Name and chapter count per book, for the index page and the sitemap. Comes
 * from the canon and the word table, so it needs no book loaded.
 */
export function bookSummary(slug: string): { slug: string; name: string; chapters: number } | null {
	if (!ALLIOLI_BY_SLUG.has(slug)) return null;
	return { slug, name: canonEntry(slug)?.de ?? slug, chapters: chapterCount(slug) };
}
