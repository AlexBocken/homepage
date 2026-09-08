/**
 * The Church Fathers' commentary, read from the `Commentary` collection that
 * `scripts/import-commentary.ts` fills. The reader's language is asked for
 * first and English answers where no translation exists yet, entry by entry.
 */
import { dbConnect } from '$utils/db';
import { Commentary, type ICommentary } from '$models/Commentary';
import { fatherById, derivedFather, isMajor, type Father, type FatherGroup } from '$lib/faith/fathers';
import { canonEntry } from '$lib/faith/bibleCanon';
import { trimCatenaPreface } from '$lib/faith/commentaryText';

import { COMMENTARY_LANGS, type CommentaryLang } from '$lib/faith/biblePrefs';
export type { CommentaryLang };

export type VerseAuthor = { id: string; name: string; n: number; group: FatherGroup; major: boolean; /** The language the author is shown in here. */ lang: CommentaryLang };
export type ChapterAuthor = { id: string; name: string; group: FatherGroup; major: boolean; lang: CommentaryLang; work: string | null; n: number; chars: number };
export type ChapterSummary = {
	/** Authors with excerpts, per verse (a range counts on its first verse). */
	verses: Record<number, VerseAuthor[]>;
	/** Authors with a chapter-level text (homilies, expositions, chapter notes) and the Catena Aurea. */
	chapter: ChapterAuthor[];
	/** Authors with a book introduction, shown on chapter 1. */
	book: ChapterAuthor[];
};

const summaryCache = new Map<string, ChapterSummary>();

/** Who commented where in this chapter, without any text — in the reader's language where a commentator has it, within `allowed` (see pickLang). */
export async function chapterSummary(slug: string, chapter: number, lang: CommentaryLang = 'de', allowed: readonly CommentaryLang[] = COMMENTARY_LANGS): Promise<ChapterSummary> {
	const key = `${slug}/${chapter}/${lang}/${allowed.join('')}`;
	const cached = summaryCache.get(key);
	if (cached) return cached;
	await dbConnect();
	let rows: Pick<ICommentary, 'verse' | 'kind' | 'author' | 'authorName' | 'group' | 'work' | 'chars' | 'source' | 'chapter' | 'lang'>[] = [];
	try {
		rows = (await Commentary.find({ slug, $or: [{ chapter }, { chapter: 0, kind: 'book' }] }, { verse: 1, kind: 1, author: 1, authorName: 1, group: 1, work: 1, chars: 1, source: 1, chapter: 1, lang: 1, _id: 0 }).lean()) as typeof rows;
	} catch {
		// No collection yet (the import has not run): the reader simply shows no discs.
		rows = [];
	}
	const verses: Record<number, Map<string, VerseAuthor>> = {};
	const chapterAuthors = new Map<string, ChapterAuthor>();
	const bookAuthors = new Map<string, ChapterAuthor>();
	// Count each (anchor, author) once whichever languages it has.
	const seen = new Set<string>();
	for (const r of pickLang(rows as ICommentary[], lang, allowed)) {
		const sig = `${r.kind}|${r.chapter}|${r.verse}|${r.author}|${r.source}`;
		const first = !seen.has(sig);
		seen.add(sig);
		if (r.kind === 'verse') {
			const m = (verses[r.verse] ??= new Map());
			const a = m.get(r.author) ?? { id: r.author, name: r.authorName, n: 0, group: r.group, major: isMajor(r.author), lang: r.lang };
			if (first) a.n++;
			m.set(r.author, a);
		} else if (r.kind === 'chapter') bump(chapterAuthors, r.author, r.authorName, r.group, r.lang, r.work, first ? r.chars : 0, first);
		else bump(bookAuthors, r.author, r.authorName, r.group, r.lang, r.work, first ? r.chars : 0, first);
	}
	const out: ChapterSummary = {
		verses: Object.fromEntries(Object.entries(verses).map(([v, m]) => [v, [...m.values()].sort(byWeight)])),
		chapter: [...chapterAuthors.values()].sort((a, b) => b.chars - a.chars),
		book: [...bookAuthors.values()]
	};
	summaryCache.set(key, out);
	return out;
}
function bump(map: Map<string, ChapterAuthor>, id: string, name: string, group: FatherGroup, lang: CommentaryLang, work: string | null, chars: number, count: boolean) {
	const a = map.get(id) ?? { id, name, group, major: isMajor(id), lang, work, n: 0, chars: 0 };
	if (count) a.n++;
	a.chars += chars;
	if (!a.work && work) a.work = work;
	map.set(id, a);
}
const GROUP_RANK: Record<FatherGroup, number> = { father: 0, medieval: 1, modern: 2 };
const byWeight = (a: VerseAuthor, b: VerseAuthor) => GROUP_RANK[a.group] - GROUP_RANK[b.group] || b.n - a.n || a.id.localeCompare(b.id);

export type Entry = { verse: number; verseEnd: number | null; work: string | null; title: string | null; lang: CommentaryLang; text: string; source: string };

/**
 * One language per author and anchor: what a commentator says on a verse,
 * or on a chapter, is shown in the reader's language when the corpora
 * carry it there — the German Fathers of the BKV, the Latin of Migne and
 * the Gloss-e editions — in English otherwise, then whatever is left. The
 * translations are separate corpora with their own cuts and order, so the
 * choice is made per (kind, anchor, author), not per row: all rows of the
 * chosen language stay, the others go.
 */
const LANG_ORDER: Record<CommentaryLang, CommentaryLang[]> = { de: ['de', 'en', 'la'], en: ['en', 'de', 'la'], la: ['la', 'en', 'de'] };
function pickLang(rows: ICommentary[], lang: CommentaryLang, allowed: readonly CommentaryLang[] = COMMENTARY_LANGS): ICommentary[] {
	const order = LANG_ORDER[lang].filter((l) => allowed.includes(l));
	const groups = new Map<string, ICommentary[]>();
	for (const r of rows) {
		const k = `${r.kind}|${r.chapter}|${r.verse}|${r.verseEnd ?? ''}|${r.author}`;
		(groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
	}
	const out: ICommentary[] = [];
	for (const g of groups.values()) {
		// Nothing in a language the reader allows: the author says nothing here.
		const have = order.find((l) => g.some((r) => r.lang === l));
		if (!have) continue;
		for (const r of g) if (r.lang === have) out.push(r);
	}
	return out.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || a.order - b.order);
}
/**
 * NPNF titles the sections of a multi-book work by their number alone, so
 * "Chapter I" of the Sermon on the Mount turns up under Matthew 5 and again
 * under Matthew 6 and reads like a chapter of the Gospel. The source has no
 * book number; for that one work it follows from the Gospel chapter.
 */
function displayTitle(r: ICommentary): string | null {
	if (r.slug === 'mt' && r.work === "Our Lord's Sermon on the Mount" && /^Chapter [IVXLC]+$/.test(r.title ?? '')) {
		return `Book ${r.chapter === 5 ? 'I' : 'II'}, ${r.title}`;
	}
	return r.title;
}
const toEntry = (r: ICommentary): Entry => ({ verse: r.verse, verseEnd: r.verseEnd, work: r.work, title: displayTitle(r), lang: r.lang, text: r.text, source: r.source });

/** One author's excerpts on one verse (ranges starting there included). */
export async function verseEntries(slug: string, chapter: number, verse: number, author: string, lang: CommentaryLang, allowed: readonly CommentaryLang[] = COMMENTARY_LANGS): Promise<Entry[]> {
	await dbConnect();
	const rows = (await Commentary.find({ slug, chapter, verse, author, kind: 'verse' }).lean()) as ICommentary[];
	return pickLang(rows, lang, allowed).map(toEntry);
}

/** One author's chapter-level text (homily sections, expositions, chapter notes). The Catena Aurea's excerpts stay with the Fathers who spoke them. */
export async function chapterText(slug: string, chapter: number, author: string, lang: CommentaryLang, allowed: readonly CommentaryLang[] = COMMENTARY_LANGS): Promise<Entry[]> {
	await dbConnect();
	const rows = (await Commentary.find({ slug, chapter, author, kind: 'chapter' }).lean()) as ICommentary[];
	return pickLang(rows, lang, allowed).map(toEntry);
}

export async function bookIntro(slug: string, author: string, lang: CommentaryLang, allowed: readonly CommentaryLang[] = COMMENTARY_LANGS): Promise<Entry[]> {
	await dbConnect();
	const rows = (await Commentary.find({ slug, chapter: 0, kind: 'book', author }).lean()) as ICommentary[];
	return pickLang(rows, lang, allowed).map(toEntry).map(catenaPreface);
}

/** Until the collection is re-imported, the Catena's prefaces are trimmed on the way out as well (see commentaryText). */
function catenaPreface(e: Entry): Entry {
	if (e.source !== 'catena-aurea') return e;
	const t = trimCatenaPreface(e.text);
	return t.trimmed ? { ...e, text: t.text, title: 'Prooemium' } : e;
}

/** Chapters of a book an author has chapter-level text for, ascending. */
export async function authorChapters(slug: string, author: string): Promise<number[]> {
	await dbConnect();
	const chapters = (await Commentary.distinct('chapter', { slug, author, kind: 'chapter' })) as number[];
	return chapters.filter((c) => c > 0).sort((a, b) => a - b);
}

/** Every (slug, chapter, author) with a chapter page, for the sitemap. */
export async function chapterPages(): Promise<{ slug: string; chapter: number; author: string }[]> {
	await dbConnect();
	const rows = (await Commentary.aggregate([
		{ $match: { $or: [{ kind: 'chapter' }, { kind: 'book' }] } },
		{ $group: { _id: { slug: '$slug', chapter: '$chapter', author: '$author' } } }
	])) as { _id: { slug: string; chapter: number; author: string } }[];
	// A book preface is chapter 0: the page under the book, not under a chapter.
	return rows.map((r) => r._id);
}

export type BookAuthor = { id: string; name: { en: string; de: string }; saint: boolean; hasPortrait: boolean; group: FatherGroup; major: boolean; died: number | null; n: number; chapters: number[]; intro: boolean };

/** Everyone who speaks in one book: entries, chapter pages and whether he has a preface, most prolific first. */
export async function bookCoverage(slug: string): Promise<BookAuthor[]> {
	await dbConnect();
	let rows: { _id: string; n: number; name: string; died: number | null; group: FatherGroup; pages: (number | null)[] }[] = [];
	try {
		rows = await Commentary.aggregate([
			{ $match: { slug } },
			{ $group: { _id: '$author', n: { $sum: 1 }, name: { $first: '$authorName' }, died: { $first: '$died' }, group: { $first: '$group' }, pages: { $addToSet: { $cond: [{ $or: [{ $eq: ['$kind', 'chapter'] }, { $eq: ['$kind', 'book'] }] }, '$chapter', null] } } } },
			{ $sort: { n: -1 } }
		]);
	} catch {
		rows = [];
	}
	return rows.map((r) => {
		const fa = fatherById(r._id);
		const pages = r.pages.filter((c): c is number => typeof c === 'number');
		return {
			id: r._id,
			name: fa?.name ?? { en: r.name, de: r.name },
			saint: !!fa?.saint,
			hasPortrait: !!fa?.portrait,
			group: fa?.group ?? r.group,
			major: !!fa?.major,
			died: fa?.died ?? r.died,
			n: r.n,
			chapters: pages.filter((c) => c > 0).sort((a, b) => a - b),
			intro: pages.includes(0)
		};
	});
}

export type AuthorInfo = { id: string; name: { en: string; de: string }; saint: boolean; died: number | null; group: FatherGroup; major: boolean; hasPortrait: boolean; n: number };
let authorsCache: AuthorInfo[] | null = null;

/** Every commentator with his entry count, most prolific first. */
export async function allAuthors(): Promise<AuthorInfo[]> {
	if (authorsCache) return authorsCache;
	await dbConnect();
	let rows: { _id: string; n: number; name: string; died: number | null; group: FatherGroup }[] = [];
	try {
		rows = await Commentary.aggregate([{ $group: { _id: '$author', n: { $sum: 1 }, name: { $first: '$authorName' }, died: { $first: '$died' }, group: { $first: '$group' } } }, { $sort: { n: -1 } }]);
	} catch {
		rows = [];
	}
	authorsCache = rows.map((r) => {
		const fa = fatherById(r._id);
		return { id: r._id, name: fa?.name ?? { en: r.name, de: r.name }, saint: !!fa?.saint, died: fa?.died ?? r.died, group: fa?.group ?? r.group, major: !!fa?.major, hasPortrait: !!fa?.portrait, n: r.n };
	});
	return authorsCache;
}

/** The registry record, or one derived from what the collection stored. */
export async function fatherFor(id: string): Promise<Father | null> {
	const known = fatherById(id);
	if (known) return known;
	await dbConnect();
	const row = (await Commentary.findOne({ author: id }, { authorName: 1, died: 1, _id: 0 }).lean()) as Pick<ICommentary, 'authorName' | 'died'> | null;
	return row ? { ...derivedFather(row.authorName, row.died), id } : null;
}

export type AuthorBook = { slug: string; n: number; chapters: number[]; intro: boolean };

/**
 * Where one commentator speaks: per book his entry count and the chapters
 * that have a page of his (chapter-level text), in canon order.
 */
export async function authorCoverage(author: string): Promise<AuthorBook[]> {
	await dbConnect();
	let rows: { _id: string; n: number; pages: number[] }[] = [];
	try {
		rows = await Commentary.aggregate([
			{ $match: { author } },
			{ $group: { _id: '$slug', n: { $sum: 1 }, pages: { $addToSet: { $cond: [{ $or: [{ $eq: ['$kind', 'chapter'] }, { $eq: ['$kind', 'book'] }] }, '$chapter', null] } } } }
		]);
	} catch {
		rows = [];
	}
	return rows
		.map((r) => {
			const pages = r.pages.filter((c): c is number => typeof c === 'number');
			return { slug: r._id, n: r.n, chapters: pages.filter((c) => c > 0).sort((a, b) => a - b), intro: pages.includes(0) };
		})
		.sort((a, b) => (canonEntry(a.slug)?.order ?? 999) - (canonEntry(b.slug)?.order ?? 999));
}
