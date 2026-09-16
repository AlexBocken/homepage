/**
 * Server side of the papal and curial documents.
 *
 * Written by `pnpm magisterium:import` into
 * `src/content/magisterium/<lang>/<slug>.json` and bundled as lazy chunks the
 * way the council's documents are: one is parsed on first use, and a deploy
 * ships `build/` alone.
 *
 * The corpus is ragged — not every document exists in every language, and not
 * every edition numbers its articles — so every read goes through `shownIn`,
 * and the language that comes back is handed on to the page, which says which
 * one it is showing. A read that names an article asks for an edition that
 * has articles: the Latin `Rerum novarum` is the AAS prose and knows of no
 * article 32, whatever the footnote citing it says.
 */
import { entryOf, shownIn } from '$lib/faith/magisterium';
import type { MagisteriumDocument, MagisteriumLang } from '$lib/faith/magisteriumTypes';

const DOCUMENTS = import.meta.glob<MagisteriumDocument>('/src/content/magisterium/*/*.json', { import: 'default' });

const cache = new Map<string, MagisteriumDocument | null>();

/** One document in one language exactly, with no falling back. */
async function exact(lang: MagisteriumLang, slug: string): Promise<MagisteriumDocument | null> {
	const key = `${lang}/${slug}`;
	if (cache.has(key)) return cache.get(key)!;
	const load = DOCUMENTS[`/src/content/magisterium/${key}.json`];
	let found: MagisteriumDocument | null = null;
	try {
		found = load ? await load() : null;
	} catch {
		found = null;
	}
	cache.set(key, found);
	return found;
}

export type Shown = { document: MagisteriumDocument; lang: MagisteriumLang; asked: MagisteriumLang };

/**
 * A document for a reader of `lang`, in that language where it exists and in
 * the nearest one where it does not. `lang !== asked` is what the page shows
 * the note about.
 */
export async function document(lang: MagisteriumLang, slug: string, article = false): Promise<Shown | null> {
	const entry = entryOf(slug);
	if (!entry) return null;
	const shown = shownIn(entry, lang, article);
	if (!shown) return null;
	const found = await exact(shown, slug);
	return found ? { document: found, lang: shown, asked: lang } : null;
}

/** A run of articles — what a peek on "Centesimus annus, 24" shows. */
export async function articles(lang: MagisteriumLang, slug: string, from: number, to: number) {
	const found = await document(lang, slug, true);
	if (!found) return null;
	const wanted = found.document.articles.filter((a) => a.n >= from && a.n <= to);
	if (!wanted.length) return null;
	return { ...found, articles: wanted };
}
