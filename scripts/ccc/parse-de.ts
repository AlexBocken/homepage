/**
 * The German Catechism, from the Innsbruck theological reading room
 * (uibk.ac.at/theol/leseraum) — one page holding the whole text.
 *
 * Why not the Vatican's own German IntraText copy, which the rest of this
 * importer uses for English: that conversion lost the punctuation of the
 * KURZTEXTE blocks wholesale — 23 commas per 1000 words against 100 in its own
 * running text, plus swallowed words ("horten", "starken"). Innsbruck carries
 * the same edition with its punctuation intact, and marks the hierarchy up as
 * real `h1`…`h6` instead of leaving it in a breadcrumb.
 *
 * The German edition prints its references in brackets in the running text
 * ("[Vgl. Lk 4,16-22]") rather than as numbered footnotes; those become notes
 * here so all three languages read the same way. Brackets without a digit are
 * glosses, not citations ("„Ordination" [ordo]"), and stay in the text.
 */
import { dom, inline, plain, tidy, tidyHtml } from './html';
import type { RawItem, RawNote } from './stream';

const SOURCE = 'https://www.uibk.ac.at/de/theol/leseraum/texte/377/';

/** Headings the reading room's own page furniture contributes. */
const CHROME = /^(Webseitensuche|Personensuche|Quicklinks|Innsbrucker Theologische Leseraum|Katechismus der Katholischen Kirche - Weltkatechismus)$/i;

/**
 * Scanner damage in the headings that would otherwise show up in the reader's
 * navigation. Only outright errors are corrected — spelling is left as printed.
 */
const HEADING_FIXES: [RegExp, string][] = [
	[/^ARTIKEL 1: DIE SOZIALE GERECHTIGKEIT$/, 'ARTIKEL 11: DIE SOZIALE GERECHTIGKEIT'],
	[/^III in einziger Glaube$/, 'III Ein einziger Glaube'],
	[/SCHOPFER/g, 'SCHÖPFER']
];

function fixHeading(text: string): string {
	let out = text;
	for (const [from, to] of HEADING_FIXES) out = out.replace(from, to);
	// "IIDas Werk Christi" — the numeral ran into the title in the scan.
	return out.replace(/^([IVX]{1,4})\.?(?=[A-ZÄÖÜ][a-zäöü])/, '$1 ').replace(/\s+/g, ' ').trim();
}

/**
 * How deep a heading really sits, which is not always the tag it was given:
 * Part One numbers its Roman subheadings `h5` while the rest of the book uses
 * `h6` for the same thing, and a KURZTEXTE block can arrive as anything from
 * `h3` to `h6`. The words decide, and the tag only breaks ties.
 */
const KEYWORD: [RegExp, number][] = [
	[/\bTEIL\b/, 1],
	[/\bABSCHNITT\b/, 2],
	[/\bKAPITEL\b/, 3],
	[/^ARTIKEL\s*\d+/i, 4],
	[/^ABSATZ\s*\d+/i, 5]
];
/** A Roman numeral opens a subheading inside an article, never a section. */
const SUBHEADING = /^[IVX]{1,5}[.)]?(?:\s|$)/;

function depth(tag: number, text: string): number {
	if (tag === 1) return 1;
	if (SUBHEADING.test(text) || /^KURZTEXTE$/i.test(text)) return 6;
	for (const [re, level] of KEYWORD) if (re.test(text)) return level;
	// An `h2`/`h3` with no keyword is one of the book's few unnamed divisions
	// ("DIE ZEHN GEBOTE", "Die Glaubenssymbola"); anything deeper is a
	// subheading inside an article, whatever tag it was given.
	return tag <= 3 ? tag : 6;
}

/**
 * A bracket holds a reference when it says "Vgl." or carries a number; the
 * others are the edition's own glosses and insertions — "„Ordination" [ordo]",
 * "[die Getauften]" — and belong in the text.
 */
function isCitation(body: string): boolean {
	return /^\s*Vgl\./.test(body) || /\d/.test(body);
}

/** Pulls `[Vgl. …]` out of a paragraph, leaving numbered markers behind. */
function liftBrackets(html: string): { html: string; notes: RawNote[] } {
	const notes: RawNote[] = [];
	// The space before a bracket goes with it: a marker belongs against the word
	// it follows, not adrift between two words.
	const out = html.replace(/\s*\[([^\]]+)\]/g, (whole, body: string) => {
		if (!isCitation(body)) return whole;
		const i = notes.length;
		notes.push({ marker: null, text: tidy(body.replace(/<[^>]+>/g, '')) });
		return `<sup data-note="${i}"></sup>`;
	});
	return { html: out, notes };
}

export async function parseGerman(fetchPage: (url: string, key: string, enc?: 'utf-8' | 'latin1') => Promise<string>): Promise<RawItem[]> {
	const doc = dom(await fetchPage(SOURCE, 'de/leseraum.htm', 'utf-8'));
	const nodes = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p'));

	const start = nodes.findIndex((n) => /^H1$/i.test(n.tagName) && /FIDEI DEPOSITUM/i.test(plain(n)));
	if (start < 0) throw new Error('[ccc/de] the reading room page no longer opens with Fidei depositum');

	const items: RawItem[] = [];
	let brief = false;
	let seenLast = false;
	for (const node of nodes.slice(start)) {
		const tag = node.tagName.toUpperCase();
		const text = plain(node);
		if (!text) continue;

		if (/^H[1-6]$/.test(tag)) {
			if (CHROME.test(text)) continue;
			const fixed = fixHeading(text);
			brief = /^KURZTEXTE$/i.test(fixed);
			items.push({ k: 'h', level: depth(Number(tag[1]), fixed), text: fixed });
			continue;
		}

		// A short, wholly bold paragraph is a heading the page didn't mark up.
		const bolded = node.querySelector('b, strong');
		if (bolded && plain(bolded).length >= text.length - 2 && text.length < 90) {
			const fixed = fixHeading(text);
			brief = /^KURZTEXTE$/i.test(fixed);
			items.push({ k: 'h', level: depth(6, fixed), text: fixed });
			continue;
		}

		const numbered = /^(\d{1,4})\.?\s+/.exec(text);
		const raw = tidyHtml(inline(node));
		if (numbered) {
			const n = Number(numbered[1]);
			const body = raw.replace(/^(<em>|<strong>)*\s*\d{1,4}\.?\s+/, (m) => m.replace(/\d{1,4}\.?\s+$/, ''));
			const { html, notes } = liftBrackets(body);
			items.push({ k: 'p', n, prefix: numbered[0], html: tidyHtml(html), notes, ...(brief ? { brief: true as const } : {}) });
			if (n === 2865) seenLast = true;
			continue;
		}
		if (seenLast) break; // page furniture below the last paragraph
		const { html, notes } = liftBrackets(raw);
		// The reading room marks an indented quotation by opening it with ">>";
		// the indent is what it means, and that is the block kind, not text.
		const quoted = tidyHtml(html).replace(/^(?:&gt;\s*)+/, '');
		if (quoted) items.push({ k: 'q', html: quoted, notes });
	}
	return items;
}
