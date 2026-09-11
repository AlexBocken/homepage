/**
 * Server side of the Second Vatican Council and the Code of Canon Law.
 *
 * Both are written by `pnpm council:import` and `pnpm cic:import` into
 * `src/content/council/<lang>/<abbr>.json` and `src/content/cic/<lang>.json`,
 * and bundled as lazy chunks the way the Bible's books and the Catechism's
 * sections are: a document is parsed once, on first use, and a deploy ships
 * `build/` alone.
 *
 * Both are numbered identically in every language — article 11 of Lumen
 * gentium is article 11 in all three — so a citation carries the number alone
 * and the reader shows it in whichever language is being read.
 */
import { COUNCIL_ABBR, type Canon, type CouncilDocument, type CouncilLang } from '$lib/faith/councilTypes';

const DOCUMENTS = import.meta.glob<CouncilDocument>('/src/content/council/*/*.json', { import: 'default' });
const CODES = import.meta.glob<Canon[]>('/src/content/cic/*.json', { import: 'default' });

const documentCache = new Map<string, CouncilDocument | null>();
const codeCache = new Map<CouncilLang, Canon[] | null>();

/** One council document, or null if there is no such abbreviation. */
export async function document(lang: CouncilLang, abbr: string): Promise<CouncilDocument | null> {
	const key = `${lang}/${abbr.toLowerCase()}`;
	if (documentCache.has(key)) return documentCache.get(key)!;
	const load = DOCUMENTS[`/src/content/council/${key}.json`];
	let found: CouncilDocument | null = null;
	try {
		found = load ? await load() : null;
	} catch {
		found = null;
	}
	documentCache.set(key, found);
	return found;
}

/** All sixteen, in the order the council promulgated them. */
export async function documents(lang: CouncilLang): Promise<CouncilDocument[]> {
	const all = await Promise.all(COUNCIL_ABBR.map((abbr) => document(lang, abbr)));
	return all.filter((d): d is CouncilDocument => d !== null);
}

/** The whole Code in one language. */
export async function code(lang: CouncilLang): Promise<Canon[]> {
	if (codeCache.has(lang)) return codeCache.get(lang) ?? [];
	const load = CODES[`/src/content/cic/${lang}.json`];
	let found: Canon[] | null = null;
	try {
		found = load ? await load() : null;
	} catch {
		found = null;
	}
	codeCache.set(lang, found);
	return found ?? [];
}

/** A run of articles of one document — what a peek on "LG 11" shows. */
export async function articles(lang: CouncilLang, abbr: string, from: number, to: number) {
	const found = await document(lang, abbr);
	if (!found) return null;
	const wanted = found.articles.filter((a) => a.n >= from && a.n <= to);
	if (!wanted.length) return null;
	return { document: found, articles: wanted };
}

/** A run of canons — what a peek on "CIC, can. 1055" shows. */
export async function canons(lang: CouncilLang, from: number, to: number): Promise<Canon[]> {
	return (await code(lang)).filter((c) => c.n >= from && c.n <= to);
}

export type CanonSection = {
	/** Where in the Code this run stands: book, part, title, chapter. */
	where: string[];
	canons: Canon[];
	/** The canon a reader asked for, to anchor the page on. */
	asked: number;
	previous: number | null;
	next: number | null;
};

/**
 * The canons that stand under the same heading as this one. The Code is far
 * too long to read in one page and too finely divided to read canon by canon,
 * so the division it prints is the page: canon 1055 comes with the rest of the
 * title on marriage, as it does in the book.
 */
export async function canonSection(lang: CouncilLang, n: number): Promise<CanonSection | null> {
	const all = await code(lang);
	const index = all.findIndex((c) => c.n === n);
	if (index < 0) return null;
	const key = (c: Canon) => c.where.join(' › ');
	const wanted = key(all[index]);

	let first = index;
	while (first > 0 && key(all[first - 1]) === wanted) first--;
	let last = index;
	while (last + 1 < all.length && key(all[last + 1]) === wanted) last++;

	return {
		where: all[index].where,
		canons: all.slice(first, last + 1),
		asked: n,
		previous: first > 0 ? all[first - 1].n : null,
		next: last + 1 < all.length ? all[last + 1].n : null
	};
}

export type CanonBook = { title: string; first: number; last: number; titles: { title: string; first: number; last: number }[] };

/** The Code's seven books and the divisions under them, for the overview. */
export async function books(lang: CouncilLang): Promise<CanonBook[]> {
	const all = await code(lang);
	const out: CanonBook[] = [];
	for (const canon of all) {
		const [book, ...rest] = canon.where;
		let current = out[out.length - 1];
		if (!current || current.title !== book) {
			current = { title: book, first: canon.n, last: canon.n, titles: [] };
			out.push(current);
		}
		current.last = canon.n;
		// One line per division, however deep the Code cuts it; the deepest
		// heading is what a reader recognises ("Titel VII Ehe").
		const title = rest[rest.length - 1] ?? book;
		const division = current.titles[current.titles.length - 1];
		if (!division || division.title !== title) current.titles.push({ title, first: canon.n, last: canon.n });
		else division.last = canon.n;
	}
	return out;
}
