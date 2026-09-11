/**
 * Client-side fetch of a passage for a reference ("Joh 3,16", "Jn 2:1-5")
 * from the reader's `stelle` endpoint, and of a Catechism paragraph for a
 * citation ("2095"), cached per reference. Both endpoints answer in the
 * language of the faith slug they are called under.
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
