/**
 * The Catechism of the Catholic Church, in German, English and Latin.
 *
 *   pnpm ccc:import                  # build from the disk cache (or fetch once)
 *   pnpm ccc:import --refresh        # re-download the sources
 *   pnpm ccc:import --report-refs    # what the footnote parser could not resolve
 *   pnpm ccc:import --report-structure
 *
 * Sources, and why each one:
 *   de  uibk.ac.at reading room — the Vatican's own German IntraText copy lost
 *       the punctuation of every KURZTEXTE block; this one didn't, and it marks
 *       the hierarchy up as headings, which is where the structure comes from.
 *   en  vatican.va ENG0015.
 *   la  intratext.com LAT0800 — the editio typica. The Vatican's Latin mirror
 *       is missing roughly a fifth of its paragraphs.
 *
 * Writes `src/content/ccc/<lang>/<section>.json` plus three derived files in
 * `src/lib/data/`: the structure, the Scripture→paragraph index the Bible
 * reader uses, and an empty file for marginal cross-references to be filled in
 * by hand (no edition online carries them).
 *
 * The text is © Libreria Editrice Vaticana; the reader credits it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { page } from './ccc/fetch';
import { parseGerman } from './ccc/parse-de';
import { parseIntratext } from './ccc/parse-intratext';
import { buildStructure } from './ccc/structure';
import { extractRefs, unresolved } from './ccc/refs';
import { missingGerman, readable } from './ccc/titles';
import { linkifyBible, newTally, type Exists, type Tally } from './ccc/linkify';
import { numbersIn, repair, type RawItem } from './ccc/stream';
import { REVISED_2267 } from './ccc/revisions';
import { CCC_LAST, cccAncestors, type CccBlock, type CccLang, type CccNote, type CccSection, type CccStructure } from '../src/lib/faith/cccTypes';

const LANGS: CccLang[] = ['de', 'en', 'la'];
const CONTENT = path.resolve('src', 'content', 'ccc');
const DATA = path.resolve('src', 'lib', 'data');

const flag = (name: string) => process.argv.includes(`--${name}`);

/**
 * Which verses the reader actually has, so a citation is only ever linked when
 * it leads somewhere: Allioli under /glaube and (with the Vulgate beside it)
 * /fides, the Douay-Rheims under /faith.
 */
const versesCache = new Map<string, Set<string>>();
function versesOf(edition: 'allioli' | 'drb', slug: string): Set<string> {
	const key = `${edition}/${slug}`;
	let have = versesCache.get(key);
	if (have) return have;
	have = new Set<string>();
	const file = path.resolve('src', 'content', 'bible', edition, `${slug}.json`);
	if (existsSync(file)) {
		const book = JSON.parse(readFileSync(file, 'utf-8')) as { chapters: { chapter: number; verses: { verse: number }[] }[] };
		for (const chapter of book.chapters) for (const verse of chapter.verses) have.add(`${chapter.chapter}/${verse.verse}`);
	}
	versesCache.set(key, have);
	return have;
}
const existsIn =
	(lang: CccLang): Exists =>
	(slug, chapter, verse) =>
		versesOf(lang === 'en' ? 'drb' : 'allioli', slug).has(`${chapter}/${verse}`);

/** Slices one language's stream into the sections the structure defines. */
function sections(items: RawItem[], lang: CccLang, structure: CccStructure, germanTitles: Map<string, string>, tally: Tally) {
	const exists = existsIn(lang);
	const link = (html: string) => linkifyBible(html, lang, exists, tally);
	const out = new Map<string, CccSection>();
	const bible = new Map<string, Map<number, Set<number>>>();
	const titleByLevel = new Map<number, string>();
	let pending: { level: number; text: string }[] = [];
	let current: CccSection | null = null;
	let markers = new Map<string, number>();

	const start = (id: string) => {
		const deepest = [...titleByLevel.keys()].sort((a, b) => b - a)[0];
		const [first, last] = structure.ranges[id] ?? [0, 0];
		const own = readable(lang, titleByLevel.get(deepest ?? 0) ?? germanTitles.get(id) ?? id);
		current = {
			id,
			label: own.label,
			title: own.title,
			breadcrumb: [...titleByLevel.entries()].sort((a, b) => a[0] - b[0]).map(([, raw]) => readable(lang, raw)),
			first,
			last,
			blocks: [],
			notes: []
		};
		markers = new Map();
		out.set(id, current);
	};

	/** Turns a block's `data-note="i"` placeholders into the section's numbering. */
	const settle = (html: string, notes: { marker: string | null; text: string }[], paragraph: number | null) => {
		if (!current) return html;
		const host = current;
		return html.replace(/<sup data-note="(\d+)"><\/sup>/g, (_, i: string) => {
			const note = notes[Number(i)];
			if (!note) return '';
			const printed = note.marker ?? '';
			let k = printed ? markers.get(printed) : undefined;
			if (k === undefined) {
				k = printed ? Number(printed) : host.notes.length + 1;
				// Two pages of one article can restart at the same number.
				while (host.notes.some((existing) => existing.k === k)) k++;
				if (printed) markers.set(printed, k);
				const refs = extractRefs(note.text, lang);
				host.notes.push({ k, html: link(note.html ?? note.text), refs } satisfies CccNote);
				if (paragraph !== null) {
					for (const ref of refs) {
						if (ref.kind !== 'bible') continue;
						const key = `${ref.slug}/${ref.chapter}`;
						const chapter = bible.get(key) ?? new Map<number, Set<number>>();
						bible.set(key, chapter);
						const upto = Math.min(ref.to ?? ref.verse, ref.verse + 40);
						for (let v = ref.verse; v <= upto; v++) {
							const at = chapter.get(v) ?? new Set<number>();
							at.add(paragraph);
							chapter.set(v, at);
						}
					}
				}
			}
			return `<sup class="fn" data-fn="${k}">${k}</sup>`;
		});
	};

	for (const item of items) {
		if (item.k === 'h') {
			if (item.level <= 5) {
				titleByLevel.set(item.level, item.text);
				for (const level of [...titleByLevel.keys()]) if (level > item.level) titleByLevel.delete(level);
				pending = [];
			} else {
				pending.push(item);
			}
			continue;
		}
		if (item.k === 'p') {
			const id = structure.sectionOf[item.n];
			if (!id) continue; // a paragraph the German edition doesn't have
			if (!current || current.id !== id) start(id);
			for (const heading of pending) current!.blocks.push({ t: 'h', level: 2, text: heading.text });
			pending = [];
			const block: CccBlock = { t: 'p', n: item.n, html: link(settle(item.html, item.notes, item.n)), ...(item.brief ? { brief: true as const } : {}) };
			current!.blocks.push(block);
			continue;
		}
		if (!current) continue;
		const last = [...current.blocks].reverse().find((b) => b.t === 'p');
		current.blocks.push({ t: 'q', html: link(settle(item.html, item.notes, last?.t === 'p' ? last.n : null)) });
	}

	for (const section of out.values()) section.notes.sort((a, b) => a.k - b.k);
	return { out, bible };
}

/** `{ "joh/3": { "16": [1216, 2614] } }` — the reverse index the Bible reader reads. */
function bibleIndex(byLang: Map<CccLang, Map<string, Map<number, Set<number>>>>) {
	const merged = new Map<string, Map<number, Set<number>>>();
	for (const perChapter of byLang.values()) {
		for (const [chapterKey, verses] of perChapter) {
			const into = merged.get(chapterKey) ?? new Map<number, Set<number>>();
			merged.set(chapterKey, into);
			for (const [verse, paragraphs] of verses) {
				const at = into.get(verse) ?? new Set<number>();
				for (const n of paragraphs) at.add(n);
				into.set(verse, at);
			}
		}
	}
	const json: Record<string, Record<string, number[]>> = {};
	for (const [chapterKey, verses] of [...merged].sort(([a], [b]) => a.localeCompare(b))) {
		json[chapterKey] = Object.fromEntries([...verses].sort((a, b) => a[0] - b[0]).map(([v, ns]) => [String(v), [...ns].sort((a, b) => a - b)]));
	}
	return json;
}

/* ------------------------------------------------------------------ */

const demoted = new Map<CccLang, number>();
const count = (lang: CccLang) => (n: number, text: string) => {
	demoted.set(lang, (demoted.get(lang) ?? 0) + 1);
	if (flag('report-demoted')) console.log(`  [${lang}] not a paragraph: ${n} — ${text}…`);
};
const german = repair(await parseGerman(page), count('de'));
console.log(`[ccc] de: ${german.length} blocks, ${numbersIn(german).size} paragraphs, ${demoted.get('de') ?? 0} false numbers`);

const { structure, titles } = buildStructure(german);
console.log(`[ccc] structure: ${structure.order.length} sections`);

if (flag('report-structure')) {
	for (const id of structure.order) {
		const [a, b] = structure.ranges[id];
		console.log(`  ${id.padEnd(12)} ${String(a).padStart(4)}–${String(b).padEnd(4)}  ${titles.get(id) ?? ''}`);
	}
}

const streams = new Map<CccLang, RawItem[]>([['de', german]]);
for (const lang of ['en', 'la'] as const) {
	const { items } = await parseIntratext(lang, page);
	streams.set(lang, repair(items, count(lang)));
	console.log(`[ccc] ${lang}: ${streams.get(lang)!.length} blocks, ${numbersIn(streams.get(lang)!).size} paragraphs, ${demoted.get(lang) ?? 0} false numbers`);
}

const missingIn = (lang: CccLang) => {
	const have = numbersIn(streams.get(lang)!);
	return Array.from({ length: CCC_LAST }, (_, i) => i + 1).filter((n) => !have.has(n));
};
let fatal = false;
for (const lang of LANGS) {
	const missing = missingIn(lang);
	if (missing.length) {
		console.error(`[ccc] ${lang}: ${missing.length} paragraphs missing — ${missing.slice(0, 60).join(', ')}${missing.length > 60 ? ' …' : ''}`);
		fatal = true;
	}
}

const perLangBible = new Map<CccLang, Map<string, Map<number, Set<number>>>>();
const built = new Map<CccLang, Map<string, CccSection>>();
for (const lang of LANGS) {
	const tally = newTally();
	const { out, bible } = sections(streams.get(lang)!, lang, structure, titles, tally);
	built.set(lang, out);
	perLangBible.set(lang, bible);
	const dropped = [...tally.dropped.entries()].sort((a, b) => b[1] - a[1]);
	console.log(
		`[ccc] ${lang}: ${out.size} sections, ${[...out.values()].reduce((n, s) => n + s.notes.length, 0)} notes, ` +
			`${tally.linked} citations linked, ${tally.psalms} psalms linked without a verse` +
			(dropped.length ? `, ${dropped.reduce((n, [, k]) => n + k, 0)} not in this Bible (${dropped.slice(0, 6).map(([b, k]) => `${b}×${k}`).join(', ')})` : '')
	);
}

// The online editions are all frozen at 1997 and still print the pre-2018
// paragraph 2267. Replace it with the text the Rescriptum promulgated, and
// retire the footnotes that belonged to the text it replaces.
for (const lang of LANGS) {
	const id = structure.sectionOf['2267'];
	const section = built.get(lang)!.get(id);
	const block = section?.blocks.find((b) => b.t === 'p' && b.n === 2267);
	if (!section || !block || block.t !== 'p') {
		console.error(`[ccc] ${lang}: paragraph 2267 not found — the 2018 revision was not applied`);
		fatal = true;
		continue;
	}
	const revision = REVISED_2267[lang];
	const retired = Array.from(block.html.matchAll(/data-fn="(\d+)"/g)).map((m) => Number(m[1]));
	section.notes = section.notes.filter((note) => !retired.includes(note.k));
	const k = retired[0] ?? Math.max(0, ...section.notes.map((note) => note.k)) + 1;
	section.notes.push({ k, html: revision.note, refs: [{ kind: 'doc', text: revision.note.replace(/<[^>]+>/g, '') }] });
	section.notes.sort((a, b) => a.k - b.k);
	block.html = revision.html.replace('{{fn}}', `<sup class="fn" data-fn="${k}">${k}</sup>`);
	block.revised = revision.on;
}

// Each language's own titles for the structure tree, read off the breadcrumbs
// its sections carry. The German ones are already there from the parse.
const nodeById = new Map<string, (typeof structure.tree)[number]>();
const walk = (nodes: typeof structure.tree) => {
	for (const node of nodes) {
		nodeById.set(node.id, node);
		walk(node.children);
	}
};
walk(structure.tree);
for (const lang of LANGS) {
	for (const section of built.get(lang)!.values()) {
		const chain = cccAncestors(section.id);
		chain.forEach((id, i) => {
			const node = nodeById.get(id);
			const named = i === chain.length - 1 ? { label: section.label, title: section.title } : section.breadcrumb[i];
			if (!node || !named?.title || node.title[lang]) return;
			node.title[lang] = named.title;
			node.label[lang] = named.label;
		});
	}
}
for (const node of nodeById.values()) {
	for (const lang of LANGS) {
		if (!node.title[lang]) node.title[lang] = node.title.de;
		if (!node.label[lang]) node.label[lang] = node.label.de;
	}
}

// Any German heading the title table has no entry for would otherwise be shown
// as the source sets it, in capitals.
const untitled = [...new Set(german.flatMap((item) => (item.k === 'h' && item.level <= 5 ? [missingGerman(item.text)] : [])).filter((t): t is string => !!t))];
if (untitled.length) {
	console.warn(`[ccc] ${untitled.length} German headings are not in the title table — they stay capitalised:`);
	for (const title of untitled) console.warn(`   ${title}`);
}

if (flag('report-refs')) {
	console.log('[ccc] unresolved book-looking tokens in footnotes:');
	for (const [token, n] of unresolved().slice(0, 60)) console.log(`   ${String(n).padStart(4)}  ${token}`);
}

if (fatal) {
	console.error('[ccc] refusing to write an incomplete Catechism');
	process.exit(1);
}

for (const lang of LANGS) {
	const dir = path.join(CONTENT, lang);
	await rm(dir, { recursive: true, force: true });
	await mkdir(dir, { recursive: true });
	for (const [id, section] of built.get(lang)!) {
		// Minified, like the Bible's books: these are build output, read by the
		// server and never by a person.
		await writeFile(path.join(dir, `${id}.json`), JSON.stringify(section));
	}
}

await mkdir(DATA, { recursive: true });
await writeFile(path.join(DATA, 'ccc-structure.json'), JSON.stringify(structure));
await writeFile(path.join(DATA, 'ccc-bible-index.json'), JSON.stringify(bibleIndex(perLangBible)));

// No edition online carries the printed margins' cross-references, so this one
// is filled in by hand over time. Created once and never overwritten.
const margins = path.join(DATA, 'ccc-margins.json');
if (!existsSync(margins)) {
	await writeFile(
		margins,
		`${JSON.stringify(
			{
				$comment: 'Marginal cross-references from the printed Catechism, added by hand: paragraph → the paragraphs its margin points to. No online edition has them.',
				margins: {}
			},
			null,
			'\t'
		)}\n`
	);
}

console.log('[ccc] written');
