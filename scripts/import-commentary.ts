/**
 * Import the Church Fathers' commentary into MongoDB.
 *
 *   pnpm commentary:import                 # dry run: counts only
 *   pnpm commentary:import --apply         # write
 *   pnpm commentary:import --book joh      # one book (with or without --apply)
 *   MONGO_URL='mongodb://…' pnpm commentary:import --apply    # production, through a tunnel
 *
 * Reads the five corpora in COMMENTARIES_DIR (default ../commentaries):
 * catenabible.json (per-verse patristic excerpts), catena_aurea.json
 * (Aquinas's chain on the Gospels, verse ranges), haydock.json (1859 notes),
 * chrysostom.json and augustine.json (NPNF homilies and expositions). Each
 * entry becomes one `Commentary` document keyed by a hash of its anchor,
 * author, language and text, so re-runs change nothing and translations
 * (`lang`) sit beside the English rows.
 *
 * Catena Bible's own Haydock and Challoner rows are skipped: Haydock comes
 * from haydock.json, Challoner's notes are already the reader's Douay notes.
 * Within one verse and author, texts that repeat across sources (same first
 * 120 characters) are kept once, Catena Bible first.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { FATHERS, findFather, derivedFather, type Father } from '../src/lib/faith/fathers';
import { trimCatenaPreface } from '../src/lib/faith/commentaryText';
import { CANON } from '../src/lib/faith/bibleCanon';
import { chapterCount } from '../src/lib/faith/readingPlan';

const APPLY = process.argv.includes('--apply');
const bookArg = process.argv[process.argv.indexOf('--book') + 1];
const ONLY_BOOK = process.argv.includes('--book') ? bookArg : null;
const DIR = process.env.COMMENTARIES_DIR ?? resolve(import.meta.dirname ?? '.', '..', '..', 'commentaries');

function mongoUrl(): string {
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const m = readFileSync(resolve(import.meta.dirname ?? '.', '..', '.env'), 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) throw new Error('MONGO_URL not set and not found in .env');
	return m[1];
}

import { OSIS } from './import-commentary-osis';

type SrcEntry = { author: string; work?: string | null; title?: string | null; text: string; lang?: string; date?: number | null; father_id?: string; note?: number };
type SrcVerse = { verse: number; verse_end?: number; commentary: SrcEntry[] };
type SrcBook = { book: { name: string; abbreviation: string; number: number }; introduction?: SrcEntry[]; chapters: { chapter: number; verses: SrcVerse[] }[] };
type SrcFile = { source: { title: string; author?: string; lang?: string; language?: string }; books: SrcBook[] };

type Doc = {
	slug: string; chapter: number; verse: number; verseEnd: number | null; kind: 'verse' | 'chapter' | 'book';
	author: string; authorName: string; group: Father['group']; died: number | null; source: string; work: string | null; title: string | null;
	lang: 'en' | 'de' | 'la'; text: string; chars: number; order: number; key: string;
};

const SOURCES: { file: string; id: string; kind: 'verse' | 'chapter'; /** Matched against `father_id` and the author's name. */ skipAuthors?: string[]; authorOverride?: string; /** The file's `work` is not a work. */ noWork?: boolean; /** OCR: an author the registry does not know is a misread citation, not a commentator. */ knownOnly?: boolean }[] = [
	{ file: 'catenabible.json', id: 'catenabible', kind: 'verse', skipAuthors: ['HDCK', 'RDCR'] },
	{ file: 'catena_aurea.json', id: 'catena-aurea', kind: 'verse' },
	{ file: 'haydock.json', id: 'haydock', kind: 'verse', authorOverride: 'haydock' },
	{ file: 'chrysostom.json', id: 'npnf', kind: 'chapter', authorOverride: 'chrysostom' },
	{ file: 'augustine.json', id: 'npnf', kind: 'chapter', authorOverride: 'augustine' },
	// German: the Bibliothek der Kirchenväter, Augustine on 1 John, Chrysostom
	// on John (OCR), and the Fraktur Catena aurea (OCR) — whose `work` field
	// only repeats the speaker ("Hieronymus.", "Chrysost. ut sup.") and is
	// dropped, and whose "Evangelientext" rows are the Gospel itself.
	{ file: 'bkv_deutsch.json', id: 'bkv', kind: 'verse' },
	{ file: 'augustinus_1joh_de.json', id: 'bkv', kind: 'verse' },
	{ file: 'chrysostom_johannes_de.json', id: 'chrysostom-de', kind: 'verse' },
	{ file: 'catena_aurea_de.json', id: 'catena-aurea-de', kind: 'verse', skipAuthors: ['Evangelientext', '+'], noWork: true, knownOnly: true },
	// Latin: Aquinas's own commentaries (Corpus Thomisticum), Augustine and
	// Gregory from Migne, and the Gloss-e editions of the Catena, the Glossa,
	// Hugh of Saint-Cher and Nicholas of Lyra on Matthew.
	{ file: 'aquinas_la.json', id: 'aquinas-la', kind: 'verse', authorOverride: 'aquinas' },
	{ file: 'migne_la.json', id: 'migne', kind: 'verse' },
	{ file: 'catena_aurea_la.json', id: 'catena-aurea-la', kind: 'verse', skipAuthors: ['+'] },
	{ file: 'glossa_ordinaria_la.json', id: 'glossa-la', kind: 'verse', skipAuthors: ['+'] },
	{ file: 'hugo_de_sancto_caro_la.json', id: 'hugo', kind: 'verse', skipAuthors: ['+', 'POETA'] },
	{ file: 'nicolaus_de_lyra_la.json', id: 'lyra-la', kind: 'verse', skipAuthors: ['+'] }
];

const authors = new Map<string, Father>(FATHERS.map((f) => [f.id, f]));
const unknownAuthors = new Map<string, number>();

function resolveAuthor(e: SrcEntry, override?: string): Father {
	if (override) return authors.get(override)!;
	const known = (e.father_id && findFather(e.father_id)) || findFather(e.author);
	if (known) return known;
	const derived = derivedFather(e.author, typeof e.date === 'number' ? e.date : null);
	if (!authors.has(derived.id)) {
		authors.set(derived.id, derived);
		unknownAuthors.set(derived.id, 0);
	}
	unknownAuthors.set(derived.id, (unknownAuthors.get(derived.id) ?? 0) + 1);
	return authors.get(derived.id)!;
}

const clean = (t: string) => t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const prefix = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
const langOf = (e: SrcEntry, file: SrcFile): Doc['lang'] => {
	const l = (e.lang ?? file.source.lang ?? file.source.language ?? process.env.COMMENTARY_LANG ?? 'en').toLowerCase();
	return l === 'de' || l === 'la' ? l : 'en';
};

function makeDoc(src: (typeof SOURCES)[number], file: SrcFile, slug: string, chapter: number, v: { verse: number; verse_end?: number }, e: SrcEntry, kind: Doc['kind'], order: number): Doc | null {
	const fa = resolveAuthor(e, src.authorOverride);
	let text = clean(e.text ?? '');
	let title = e.title?.trim() || null;
	if (src.id === 'catena-aurea' && kind === 'book') {
		// Drop the Oxford translators' preface and list of authors that the
		// source runs together with Aquinas's prooemium (see commentaryText).
		const t = trimCatenaPreface(text);
		if (t.trimmed) (text = t.text), (title = 'Prooemium');
	}
	if (text.length < 8) return null;
	const lang = langOf(e, file);
	const verseEnd = typeof v.verse_end === 'number' && v.verse_end > v.verse ? v.verse_end : null;
	const key = createHash('sha1').update([src.id, slug, chapter, v.verse, verseEnd ?? '', fa.id, lang, text.slice(0, 200)].join('|')).digest('hex');
	return {
		slug, chapter, verse: v.verse, verseEnd, kind,
		author: fa.id, authorName: fa.name.en, group: fa.group, died: fa.died, source: src.id,
		work: src.noWork ? null : e.work?.trim() || null, title, lang, text, chars: text.length, order, key
	};
}

const docs: Doc[] = [];
const perSource = new Map<string, number>();
const badBooks = new Set<string>();
let reanchored = 0;

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
const roman = (s: string) => [...s.toLowerCase()].reduce((t, ch, i, a) => t + (i + 1 < a.length && ROMAN[a[i + 1]] > ROMAN[ch] ? -ROMAN[ch] : ROMAN[ch]), 0);
const GOSPEL: Record<string, string> = { matt: 'mt', mark: 'mk', luke: 'lk', john: 'joh' };

/**
 * Where the NPNF file anchors an entry wrongly, the place it belongs.
 *
 * - A sermon's heading names its text ("On the words of the Gospel, Matt.
 *   xi. 28"); six of Augustine's sermons sit at another chapter or verse
 *   than their heading says, and the heading wins.
 * - The file puts each book of *Our Lord's Sermon on the Mount* whole under
 *   the chapter it opens on, so Book II (Matthew 6–7) sat entirely under 6.
 *   Its chapters XIX–XXV expound Matthew 7 ("judge not" begins XIX) and
 *   move there; and the bare "Chapter N" headings get their book, as they
 *   read like chapters of the Gospel otherwise.
 */
function reanchor(source: string, slug: string, chapter: number, v: { verse: number }, e: SrcEntry): { chapter: number; verse: number; title: string | undefined | null } {
	let title = e.title;
	if (source !== 'npnf') return { chapter, verse: v.verse, title };
	if (slug === 'mt' && e.work === "Our Lord's Sermon on the Mount" && /^Chapter [IVXLC]+$/.test(title ?? '')) {
		const n = roman(title!.slice(8));
		const book = chapter === 5 ? 'I' : 'II';
		return { chapter: book === 'II' && n >= 19 ? 7 : chapter, verse: v.verse, title: `Book ${book}, ${title}` };
	}
	const m = /\bGospel,?\s+(?:according to\s+)?(?:S\.\s+|St\.\s+)?(Matt|Mark|Luke|John)\.?\s+([ivxlc]+)\.\s*(\d+)/i.exec(title ?? '');
	if (m && GOSPEL[m[1].toLowerCase()] === slug) {
		const ch = roman(m[2]);
		const verse = Number(m[3]);
		if (ch >= 1 && ch <= chapterCount(slug) && (ch !== chapter || verse !== v.verse)) return { chapter: ch, verse, title };
	}
	return { chapter, verse: v.verse, title };
}

for (const src of SOURCES) {
	const path = resolve(DIR, src.file);
	if (!existsSync(path)) {
		console.warn(`[commentary] ${src.file} not found in ${DIR}, skipped`);
		continue;
	}
	const file = JSON.parse(readFileSync(path, 'utf-8')) as SrcFile;
	let n = 0;
	for (const b of file.books) {
		const slug = OSIS[b.book.abbreviation];
		if (!slug || !(slug in CANON)) {
			badBooks.add(`${src.file}:${b.book.abbreviation}`);
			continue;
		}
		if (ONLY_BOOK && slug !== ONLY_BOOK) continue;
		let order = 0;
		const skipped = (e: SrcEntry) =>
			(!!src.skipAuthors && (src.skipAuthors.includes(e.father_id ?? '') || src.skipAuthors.includes(e.author?.trim() ?? ''))) ||
			(!!src.knownOnly && !src.authorOverride && !((e.father_id && findFather(e.father_id)) || findFather(e.author)));
		for (const e of b.introduction ?? []) {
			if (skipped(e)) continue;
			const d = makeDoc(src, file, slug, 0, { verse: 0 }, e, 'book', order++);
			if (d) docs.push(d), n++;
		}
		for (const c of b.chapters) {
			if (c.chapter < 1 || c.chapter > chapterCount(slug) + 6) continue;
			for (const v of c.verses) {
				for (const e of v.commentary) {
					if (skipped(e)) continue;
					const kind: Doc['kind'] = src.kind === 'chapter' || v.verse === 0 ? 'chapter' : 'verse';
					const at = reanchor(src.id, slug, c.chapter, v, e);
					if (at.chapter !== c.chapter || at.verse !== v.verse) reanchored++;
					const d = makeDoc(src, file, slug, at.chapter, at.verse === v.verse ? v : { verse: at.verse }, { ...e, title: at.title }, kind, order++);
					if (d) docs.push(d), n++;
				}
			}
		}
	}
	perSource.set(src.id, (perSource.get(src.id) ?? 0) + n);
	console.log(`[commentary] ${src.file}: ${n} entries`);
}
if (reanchored) console.log(`[commentary] ${reanchored} entries re-anchored to the chapter their heading or book names`);

// Same text under the same anchor and author from two sources: keep the
// first (sources are listed in priority order). Within one source two
// entries may open alike (a homily quoting the verse), so those all stay.
const seen = new Map<string, string>();
const kept: Doc[] = [];
let dupes = 0;
for (const d of docs) {
	// Chapter texts (homily sections) and book prefaces are never duplicates
	// of an excerpt, even where an excerpt was cut from the same homily.
	if (d.kind !== 'verse') {
		kept.push(d);
		continue;
	}
	const sig = [d.slug, d.chapter, d.verse, d.author, d.lang, prefix(d.text)].join('|');
	const firstSource = seen.get(sig);
	if (firstSource && firstSource !== d.source) {
		dupes++;
		continue;
	}
	if (!firstSource) seen.set(sig, d.source);
	kept.push(d);
}

const perAuthor = new Map<string, number>();
for (const d of kept) perAuthor.set(d.author, (perAuthor.get(d.author) ?? 0) + 1);
const perKind = new Map<string, number>();
for (const d of kept) perKind.set(`${d.source}/${d.kind}`, (perKind.get(`${d.source}/${d.kind}`) ?? 0) + 1);
console.log(`[commentary] ${kept.length} entries after ${dupes} duplicates removed; ${[...perKind].map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`[commentary] ${authors.size} authors, ${unknownAuthors.size} derived from the sources (top: ${[...unknownAuthors].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => `${id} ${n}`).join(', ')})`);
console.log(`[commentary] top authors: ${[...perAuthor].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => `${id} ${n}`).join(', ')}`);
if (badBooks.size) console.warn(`[commentary] unknown book abbreviations: ${[...badBooks].join(', ')}`);

if (!APPLY) {
	console.log('[commentary] dry run; pass --apply to write');
	process.exit(0);
}

await mongoose.connect(mongoUrl(), { serverSelectionTimeoutMS: 10000 });
const col = mongoose.connection.db!.collection('commentaries');
let upserted = 0;
let matched = 0;
for (let i = 0; i < kept.length; i += 5000) {
	const batch = kept.slice(i, i + 5000);
	const res = await col.bulkWrite(batch.map((d) => ({ updateOne: { filter: { key: d.key }, update: { $set: d }, upsert: true } })), { ordered: false });
	upserted += res.upsertedCount;
	matched += res.matchedCount;
	process.stdout.write(`\r[commentary] ${Math.min(i + 5000, kept.length)} / ${kept.length}`);
}
console.log();
await col.createIndex({ key: 1 }, { unique: true });
await col.createIndex({ slug: 1, chapter: 1, verse: 1, author: 1, lang: 1 });
await col.createIndex({ slug: 1, chapter: 1, kind: 1, lang: 1 });
await col.createIndex({ author: 1, slug: 1, chapter: 1, lang: 1 });
console.log(`[commentary] ${upserted} inserted, ${matched} already there`);
await mongoose.disconnect();
