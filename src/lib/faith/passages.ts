/**
 * Client-side fetch of a passage for a reference ("Joh 3,16", "Jn 2:1-5")
 * from the reader's `stelle` endpoint, of a Catechism paragraph for a citation
 * ("2095"), and of a council article or a canon for the citations the
 * Catechism makes of those ("LG 11", "CIC, can. 1055") — cached per reference.
 * Every endpoint answers in the language of the faith slug it is called under.
 */
export type Passage = {
	label: string;
	slug: string | null;
	chapter: number;
	verses: { verse: number; text: string }[];
	more: boolean;
};

const cache = new Map<string, Passage | null>();

export async function fetchPassage(faithLang: string, reference: string): Promise<Passage | null> {
	const key = `${faithLang}:${reference}`;
	if (cache.has(key)) return cache.get(key)!;
	try {
		const res = await fetch(`/api/${faithLang}/bibel/stelle?ref=${encodeURIComponent(reference)}`);
		const passage = res.ok ? ((await res.json()) as Passage) : null;
		cache.set(key, passage);
		return passage;
	} catch {
		return null;
	}
}

/** A Catechism paragraph (or short range) behind a `KKK 2095` citation. */
export type CccPeek = {
	label: string;
	where: string;
	goto: string;
	paragraphs: { n: number; html: string }[];
	more: boolean;
};

const cccCache = new Map<string, CccPeek | null>();
const docCache = new Map<string, CccPeek | null>();

/** Whatever a peek endpoint answers, which is the same shape for all of them. */
async function peek(cache: Map<string, CccPeek | null>, key: string, url: string): Promise<CccPeek | null> {
	if (cache.has(key)) return cache.get(key)!;
	try {
		const res = await fetch(url);
		const body = res.ok ? ((await res.json()) as CccPeek) : null;
		cache.set(key, body);
		return body;
	} catch {
		return null;
	}
}

/**
 * A council article behind an "LG 11", by the reference the Catechism's markup
 * carries: `lg/11`, or `sc/122-127` for a run of them.
 */
export function fetchCouncil(faithLang: string, reference: string): Promise<CccPeek | null> {
	const [abbr, article] = reference.split('/');
	if (!abbr || !article) return Promise.resolve(null);
	return peek(docCache, `konzil:${faithLang}:${reference}`, `/api/${faithLang}/konzil/${encodeURIComponent(abbr)}/${encodeURIComponent(article)}`);
}

/**
 * A papal document's article behind a "CA 32", by the reference the markup
 * carries: `centesimus-annus/32`, or `redemptor-hominis/18-21` for a run.
 */
export function fetchMagisterium(faithLang: string, reference: string): Promise<CccPeek | null> {
	const [slug, article] = reference.split('/');
	if (!slug || !article) return Promise.resolve(null);
	return peek(docCache, `lehrschreiben:${faithLang}:${reference}`, `/api/${faithLang}/lehrschreiben/${encodeURIComponent(slug)}/${encodeURIComponent(article)}`);
}

/** A canon of the Code behind a "CIC, can. 1055". */
export function fetchCanon(faithLang: string, reference: string): Promise<CccPeek | null> {
	return peek(docCache, `cic:${faithLang}:${reference}`, `/api/${faithLang}/kirchenrecht/${encodeURIComponent(reference)}`);
}

export async function fetchCcc(faithLang: string, reference: string): Promise<CccPeek | null> {
	const key = `${faithLang}:${reference}`;
	if (cccCache.has(key)) return cccCache.get(key)!;
	try {
		const res = await fetch(`/api/${faithLang}/katechismus/${encodeURIComponent(reference)}`);
		const peek = res.ok ? ((await res.json()) as CccPeek) : null;
		cccCache.set(key, peek);
		return peek;
	} catch {
		return null;
	}
}
