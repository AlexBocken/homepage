/**
 * The sixteen documents of the Second Vatican Council, in German, English and
 * Latin, from vatican.va.
 *
 *   pnpm council:import            # build from the disk cache (or fetch once)
 *   pnpm council:import --refresh  # re-download
 *
 * The Catechism cites the council 728 times — one footnote in five, more than
 * anything else it quotes apart from Scripture — and in the German edition
 * more than five hundred of those citations stand in the running text, where
 * they have been dead words until now. The council is also the only body the
 * Catechism leans on that vatican.va publishes in all three of the languages
 * this site reads, which is why it is here and Denzinger is not.
 *
 * Writes `src/content/council/<lang>/<abbr>.json`, and refuses a document
 * whose articles do not come out at the number it is known to have.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { page } from './ccc/fetch';
import { COUNCIL, MISNUMBERED, councilUrl } from './council/documents';
import { parseCouncil } from './council/parse';
import type { CouncilDocument, CouncilLang } from '../src/lib/faith/councilTypes';

const LANGS: CouncilLang[] = ['de', 'en', 'la'];
const CONTENT = path.resolve('src', 'content', 'council');

/**
 * What the page calls the document, without the incipit repeated in it and
 * without the dash left behind where the incipit used to be.
 */
function subtitleOf(raw: string, title: string): string {
	return raw
		.replace(new RegExp(title, 'gi'), '')
		.replace(/\s*[-–—:]\s*$/, '')
		.replace(/^\s*[-–—:]\s*/, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

let fatal = false;
const built = new Map<CouncilLang, CouncilDocument[]>();

for (const lang of LANGS) {
	const documents: CouncilDocument[] = [];
	for (const source of COUNCIL) {
		const html = await page(councilUrl(source, lang), `council/${lang}/${source.abbr}.html`);
		const corrections = MISNUMBERED.filter((c) => c.lang === lang && c.abbr === source.abbr).map((c) => ({ article: c.article, opens: c.opens }));
		const parsed = parseCouncil(html, corrections, source.articles);
		const highest = parsed.articles[parsed.articles.length - 1]?.n ?? 0;
		if (highest !== source.articles) {
			console.error(`[council] ${lang} ${source.abbr}: parsed ${parsed.articles.length} articles up to ${highest}, expected ${source.articles}`);
			fatal = true;
		}
		documents.push({
			abbr: source.abbr,
			title: source.title,
			subtitle: subtitleOf(parsed.subtitle, source.title),
			kind: source.kind,
			date: source.date,
			articles: parsed.articles,
			notes: parsed.notes
		});
	}
	const articles = documents.reduce((n, d) => n + d.articles.length, 0);
	const notes = documents.reduce((n, d) => n + d.notes.length, 0);
	// Some pages carry the text and the signatures but never transcribed the
	// footnotes. Say which, rather than let a reader wonder where they went.
	const noNotes = documents.filter((d) => !d.notes.length).map((d) => d.abbr);
	console.log(`[council] ${lang}: ${documents.length} documents, ${articles} articles, ${notes} notes` + (noNotes.length ? ` — no notes on vatican.va for ${noNotes.join(', ')}` : ''));
	built.set(lang, documents);
}

if (fatal) {
	console.error('[council] refusing to write a document that did not come out whole');
	process.exit(1);
}

for (const lang of LANGS) {
	const dir = path.join(CONTENT, lang);
	await rm(dir, { recursive: true, force: true });
	await mkdir(dir, { recursive: true });
	for (const document of built.get(lang)!) {
		await writeFile(path.join(dir, `${document.abbr.toLowerCase()}.json`), JSON.stringify(document));
	}
}

console.log('[council] written');
