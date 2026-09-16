/**
 * The papal and curial documents the Catechism cites, in whichever of German,
 * English and Latin vatican.va publishes them.
 *
 *   pnpm magisterium:import             # build from the disk cache (or fetch once)
 *   pnpm magisterium:import --refresh   # re-download
 *   pnpm magisterium:import --report    # print what was found and write nothing
 *
 * The Catechism's footnotes name 47 papal or curial documents and cite them
 * some 200 times; `Centesimus annus` alone twenty-seven. Until now every one
 * of those was a dead word on the page.
 *
 * Two checks stand between a parse and the content directory. The first is
 * the council's: a document whose articles do not come out at the number it
 * is known to have is refused rather than shipped short. The second is free
 * and better — a document published in more than one language must come out
 * at the *same* number in each, because article 24 of Centesimus annus is
 * article 24 in all of them. A disagreement means a parser fault, and it is
 * caught without anyone having counted anything by hand.
 *
 * Writes `src/content/magisterium/<lang>/<slug>.json` and the shared index
 * `src/lib/data/magisterium-index.json`, which the reader, the route matcher
 * and the Catechism's linkifier all read. Run this **before** `ccc:import`:
 * the linkifier needs the index to know how many articles a document has.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { page } from './ccc/fetch';
import { MAGISTERIUM, magisteriumUrl, type MagisteriumSource } from './magisterium/documents';
import { parseMagisterium } from './magisterium/parse';
import type { Parsed } from './magisterium/parse';
import type { MagisteriumDocument, MagisteriumEntry, MagisteriumLang } from '../src/lib/faith/magisteriumTypes';

const LANGS: MagisteriumLang[] = ['de', 'en', 'la'];
const CONTENT = path.resolve('src', 'content', 'magisterium');
const INDEX = path.resolve('src', 'lib', 'data', 'magisterium-index.json');
const REPORT = process.argv.includes('--report');

/** What one document came to, in each language that has it. */
type Built = { source: MagisteriumSource; parsed: Map<MagisteriumLang, Parsed> };

const built: Built[] = [];
/** Editions left out on purpose, and editions that number nothing. */
const skipped: string[] = [];
const unnumbered: string[] = [];
let fatal = false;

for (const source of MAGISTERIUM) {
	const parsed = new Map<MagisteriumLang, Parsed>();
	for (const lang of LANGS) {
		const url = magisteriumUrl(source, lang);
		if (!url) continue;
		// Only a *broken* edition is left out — one that breaks off half way.
		// An edition whose numbers are not ours is still worth reading.
		if (source.skip?.[lang]) { skipped.push(`${source.slug} ${lang}: ${source.skip[lang]}`); continue; }
		const corrections = source.opens?.[lang] ? [{ article: 1, opens: source.opens[lang]! }] : [];
		let html: string;
		try {
			html = await page(url, `magisterium/${lang}/${source.slug}.html`, 'utf-8');
		} catch {
			// A language vatican.va does not have at all. The ones it has but
			// has not filled in answer 200 and are caught by the parser.
			continue;
		}
		// The older Latin pages are the text as the AAS printed it, in
		// continuous prose: read as paragraphs, and not citable by article.
		const asText = !!source.unnumbered?.[lang];
		const document = parseMagisterium(html, corrections, source.articles, asText);
		if (document && !document.numbered) unnumbered.push(`${source.slug} ${lang}${asText ? `: ${source.unnumbered![lang]}` : ''}`);
		if (document) parsed.set(lang, document);
	}
	built.push({ source, parsed });
}

/* ---------- what came out, and whether it is allowed to ship ---------- */

for (const { source, parsed } of built) {
	const langs = [...parsed.keys()];
	if (!langs.length) {
		console.error(`[magisterium] ${source.slug}: no language has a text — is the file name right?`);
		fatal = true;
		continue;
	}
	// Only the editions that number can be checked against each other; the
	// rest are paragraphs, and paragraphs come out at whatever length they are.
	const numbered = langs.filter((lang) => parsed.get(lang)!.numbered);
	const counts = numbered.map((lang) => parsed.get(lang)!.articles.at(-1)?.n ?? 0);
	const agreed = counts.every((n) => n === counts[0]);
	const line = langs.map((lang) => `${lang} ${parsed.get(lang)!.numbered ? parsed.get(lang)!.articles.at(-1)?.n ?? 0 : '—'}/${parsed.get(lang)!.notes.length}`).join('  ');
	if (!agreed) {
		console.error(`[magisterium] ${source.slug}: the editions disagree on how many articles it has — ${line}`);
		fatal = true;
	} else if (source.articles !== (counts[0] ?? 0)) {
		console.error(`[magisterium] ${source.slug}: parsed ${counts[0] ?? 0} articles, expected ${source.articles}`);
		fatal = true;
	}
	if (REPORT) console.log(`${source.slug.padEnd(30)} articles ${String(counts[0] ?? 0).padStart(3)}   ${line}`);
}

// vatican.va's German translations of the encyclicals mostly drop the
// footnotes. Say which, rather than let a reader wonder where they went.
const noNotes = built.flatMap(({ source, parsed }) =>
	[...parsed].filter(([, d]) => !d.notes.length).map(([lang]) => `${source.slug} ${lang}`)
);
if (unnumbered.length) console.log(`[magisterium] ${unnumbered.length} editions print no article numbers — kept as paragraphs, not citable:\n   ${unnumbered.join('\n   ')}`);
if (skipped.length) console.log(`[magisterium] ${skipped.length} editions left out as incomplete:\n   ${skipped.join('\n   ')}`);
if (noNotes.length) console.log(`[magisterium] ${noNotes.length} editions carry the text but no footnotes: ${noNotes.join(', ')}`);

if (REPORT) {
	const have = (lang: MagisteriumLang) => built.filter((b) => b.parsed.has(lang)).length;
	console.log(`\n[magisterium] ${built.length} documents — de ${have('de')}, en ${have('en')}, la ${have('la')}`);
	const noGerman = built.filter((b) => !b.parsed.has('de')).map((b) => b.source.slug);
	console.log(`[magisterium] no German: ${noGerman.length}`);
	const unciteable = built.filter((b) => ![...b.parsed.values()].some((d) => d.numbered)).map((b) => b.source.slug);
	console.log(`[magisterium] readable but not citable by article: ${unciteable.length}${unciteable.length ? ` — ${unciteable.join(', ')}` : ''}`);
	process.exit(fatal ? 1 : 0);
}

if (fatal) {
	console.error('[magisterium] refusing to write a document that did not come out whole');
	process.exit(1);
}

/* ---------- write ---------- */

await rm(CONTENT, { recursive: true, force: true });
const index: MagisteriumEntry[] = [];

for (const { source, parsed } of built) {
	const langs = LANGS.filter((lang) => parsed.has(lang));
	for (const lang of langs) {
		const document = parsed.get(lang)!;
		const out: MagisteriumDocument = {
			slug: source.slug,
			title: source.title,
			subtitle: document.subtitle,
			kind: source.kind,
			author: source.author,
			date: source.date,
			numbered: document.numbered,
			articles: document.articles,
			notes: document.notes
		};
		const dir = path.join(CONTENT, lang);
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, `${source.slug}.json`), JSON.stringify(out));
	}
	const numbered = langs.filter((lang) => parsed.get(lang)!.numbered);
	index.push({
		slug: source.slug,
		title: source.title,
		kind: source.kind,
		author: source.author,
		date: source.date,
		langs,
		numbered,
		articles: numbered.length ? parsed.get(numbered[0])!.articles.at(-1)?.n ?? 0 : 0
	});
}

index.sort((a, b) => a.date.localeCompare(b.date));
await writeFile(INDEX, JSON.stringify(index, null, '\t') + '\n');

const articles = built.reduce((n, b) => n + [...b.parsed.values()].reduce((m, d) => m + d.articles.length, 0), 0);
const notes = built.reduce((n, b) => n + [...b.parsed.values()].reduce((m, d) => m + d.notes.length, 0), 0);
console.log(`[magisterium] ${index.length} documents, ${articles} articles, ${notes} notes written`);
