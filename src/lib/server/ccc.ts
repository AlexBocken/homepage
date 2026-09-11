/**
 * Server side of the Catechism.
 *
 * Sections live in `src/content/ccc/<lang>/<id>.json`, written by
 * `pnpm ccc:import`; the structure that binds them — which paragraph belongs to
 * which section, in what order, under what titles — is one file shared by all
 * three languages, because every edition numbers its paragraphs identically.
 *
 * Files are bundled as lazy chunks the way the Bible's books are, so a deploy
 * ships `build/` alone and a section is parsed once, on first use.
 */
import { building } from '$app/environment';
import structureJson from '$lib/data/ccc-structure.json';
import bibleIndexJson from '$lib/data/ccc-bible-index.json';
import marginsJson from '$lib/data/ccc-margins.json';
import { foldUmlauts } from '$lib/faith/bibleCanon';
import { CCC_LAST, type CccBlock, type CccLang, type CccSection, type CccStructure } from '$lib/faith/cccTypes';

const FILES = import.meta.glob<CccSection>('/src/content/ccc/*/*.json', { import: 'default' });
const keyOfPath = (p: string) => p.replace(/^.*\/ccc\//, '').replace(/\.json$/, '');
const BY_KEY = new Map(Object.entries(FILES).map(([p, load]) => [keyOfPath(p), load]));

// The JSON import types `ranges` as `number[]`; the file is written by
// `pnpm ccc:import`, which always writes a pair.
export const structure = structureJson as unknown as CccStructure;
const bibleIndex = bibleIndexJson as Record<string, Record<string, number[]>>;
const margins = (marginsJson as { margins?: Record<string, number[]> }).margins ?? {};

const cache = new Map<string, CccSection | null>();

/** Section ids in reading order. */
export const sectionOrder: string[] = structure.order;

/** The section a paragraph sits in, or null if there is no such paragraph. */
export function sectionOf(n: number): string | null {
	if (!Number.isInteger(n) || n < 1 || n > CCC_LAST) return null;
	return structure.sectionOf[String(n)] ?? null;
}

export async function loadSection(lang: CccLang, id: string): Promise<CccSection | null> {
	const key = `${lang}/${id}`;
	if (cache.has(key)) return cache.get(key)!;
	let section: CccSection | null = null;
	try {
		const load = BY_KEY.get(key);
		section = load ? await load() : null;
	} catch {
		section = null;
	}
	cache.set(key, section);
	return section;
}

/** What comes before and after a section, for the reader's foot. */
export function neighbours(id: string): { prev: string | null; next: string | null } {
	const i = sectionOrder.indexOf(id);
	if (i < 0) return { prev: null, next: null };
	return { prev: sectionOrder[i - 1] ?? null, next: sectionOrder[i + 1] ?? null };
}

export type CccParagraph = {
	n: number;
	html: string;
	brief: boolean;
	revised: string | null;
	/** The section's notes this paragraph's markers point at. */
	notes: { k: number; html: string }[];
	/** Unnumbered quotations that continue it. */
	quotes: string[];
};

/**
 * Paragraphs `from`…`to`, with the footnotes they cite. This is what a citation
 * peek and the API answer with, so it carries the notes along rather than
 * making the caller fetch the whole section for them.
 */
export async function paragraphs(lang: CccLang, from: number, to = from): Promise<{ section: string; title: string; paragraphs: CccParagraph[]; more: boolean } | null> {
	const id = sectionOf(from);
	if (!id) return null;
	const section = await loadSection(lang, id);
	if (!section) return null;

	const out: CccParagraph[] = [];
	let current: CccParagraph | null = null;
	for (const block of section.blocks) {
		if (block.t === 'p') {
			current = block.n >= from && block.n <= to ? { n: block.n, html: block.html, brief: block.brief === true, revised: block.revised ?? null, notes: notesOf(section, block), quotes: [] } : null;
			if (current) out.push(current);
			continue;
		}
		if (block.t === 'q' && current) current.quotes.push(block.html);
		if (block.t === 'h') current = null;
	}
	// A range may run past the end of its section; say so rather than lying.
	return { section: id, title: section.title, paragraphs: out, more: to > section.last };
}

function notesOf(section: CccSection, block: CccBlock & { t: 'p' }): { k: number; html: string }[] {
	const wanted = new Set(Array.from(block.html.matchAll(/data-fn="(\d+)"/g)).map((m) => Number(m[1])));
	return section.notes.filter((note) => wanted.has(note.k)).map(({ k, html }) => ({ k, html }));
}

/** The Catechism paragraphs whose footnotes cite a verse. */
export function citing(slug: string, chapter: number, verse: number): number[] {
	return bibleIndex[`${slug}/${chapter}`]?.[String(verse)] ?? [];
}

/** Whether a chapter is cited anywhere, so the reader can skip the lookup per verse. */
export function citesChapter(slug: string, chapter: number): boolean {
	return `${slug}/${chapter}` in bibleIndex;
}

/** Hand-entered marginal cross-references, empty until someone types them in. */
export function marginsFor(n: number): number[] {
	return margins[String(n)] ?? [];
}

/* ---------------- search ---------------- */

type Entry = { n: number; section: string; text: string; folded: string };
const indexes = new Map<CccLang, Promise<Entry[]>>();

const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function searchIndex(lang: CccLang): Promise<Entry[]> {
	let p = indexes.get(lang);
	if (!p) {
		p = (async () => {
			const out: Entry[] = [];
			for (const id of sectionOrder) {
				const section = await loadSection(lang, id);
				if (!section) continue;
				for (const block of section.blocks) {
					if (block.t !== 'p') continue;
					const text = strip(block.html);
					out.push({ n: block.n, section: id, text, folded: foldUmlauts(text) });
				}
			}
			return out;
		})();
		indexes.set(lang, p);
	}
	return p;
}

// Warmed at startup like the Bible's, and for the same reason: the first search
// of a cold process would otherwise parse all 113 sections while someone waits.
const warm = !building && !process.argv[1]?.includes('vite-node');
if (warm) for (const lang of ['de', 'en', 'la'] as const) void searchIndex(lang).catch(() => indexes.delete(lang));

export type CccHit = { n: number; section: string; text: string };

/** Substring search over the paragraphs of one language; case and umlauts do not matter. */
export async function search(lang: CccLang, query: string, limit = 60): Promise<CccHit[]> {
	const q = foldUmlauts(query.trim());
	if (q.length < 2) return [];
	const hits: CccHit[] = [];
	for (const e of await searchIndex(lang)) {
		if (!e.folded.includes(q)) continue;
		hits.push({ n: e.n, section: e.section, text: e.text });
		if (hits.length >= limit) break;
	}
	return hits;
}
