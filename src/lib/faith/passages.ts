/**
 * Client-side fetch of a passage for a reference ("Joh 3,16", "Jn 2:1-5")
 * from the reader's `stelle` endpoint, cached per reference. The endpoint
 * answers in the language of the faith slug it is called under.
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
