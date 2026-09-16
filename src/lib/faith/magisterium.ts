/**
 * The index of papal and curial documents, as the reader and the Catechism's
 * linkifier both need it.
 *
 * `magisterium-index.json` is written by `pnpm magisterium:import` beside the
 * documents themselves, so there is one place that knows which languages a
 * document exists in and how many articles it has — and no hand-kept copy of
 * it to drift.
 */
import index from '$lib/data/magisterium-index.json';
import type { MagisteriumEntry, MagisteriumLang } from './magisteriumTypes';

export const MAGISTERIUM = index as MagisteriumEntry[];

const BY_SLUG = new Map(MAGISTERIUM.map((entry) => [entry.slug, entry]));

/** One document's index entry, or null if there is no such address. */
export const entryOf = (slug: string): MagisteriumEntry | null => BY_SLUG.get(slug) ?? null;

export const isMagisteriumSlug = (slug: string): boolean => BY_SLUG.has(slug);

/**
 * The language to show a document in, which is not always the one being read.
 * vatican.va publishes Leo XIII in English and Latin and not in German, so a
 * German reader gets the Latin and is told so, rather than an empty page.
 */
export function shownIn(entry: MagisteriumEntry, lang: MagisteriumLang, article = false): MagisteriumLang | null {
	// A citation names an article, so it must be answered by an edition that
	// has articles. The Latin `Rerum novarum` is the acta as they were set and
	// knows of no article 32, whatever the footnote citing it says — its
	// thirty-second paragraph is not the same thing and must not stand in.
	const have = article ? entry.numbered : entry.langs;
	if (have.includes(lang)) return lang;
	// Latin before English: it is what the Catechism's own notes cite, and the
	// numbering a citation counts is always the Latin's. But an edition with
	// articles in it comes before one without, whatever the language: a reader
	// sent to a document is better served by the one they can be sent *into*.
	const order = ['la', 'en', 'de'] as const;
	for (const fallback of order) if (have.includes(fallback) && entry.numbered.includes(fallback)) return fallback;
	for (const fallback of order) if (have.includes(fallback)) return fallback;
	return null;
}

/** Everything one author issued, newest first — how the index page groups. */
export function byAuthor(author: string): MagisteriumEntry[] {
	return MAGISTERIUM.filter((entry) => entry.author === author).sort((a, b) => b.date.localeCompare(a.date));
}
