/**
 * The English and Latin Catechism, both from IntraText conversions: English on
 * vatican.va (ENG0015), Latin at intratext.com (LAT0800, the editio typica —
 * the Vatican's own Latin mirror is missing roughly a fifth of its paragraphs
 * and its index links only 18 of the pages).
 *
 * Both carry the real footnote apparatus: `<sup>` markers in the text and a
 * numbered list below a 30%-wide rule. Both also hide their structure in a
 * breadcrumb rather than in headings, and mark article titles as ordinary
 * paragraphs, so headings are recognised by shape.
 */
import { dom, inline, plain, tidy, tidyHtml } from './html';
import type { RawItem, RawNote } from './stream';

type Source = { base: string; index: string; brief: RegExp; encoding: 'utf-8' | 'latin1' };

export const INTRATEXT: Record<'en' | 'la', Source> = {
	en: {
		base: 'https://www.vatican.va/archive/ENG0015/',
		index: 'https://www.vatican.va/archive/ENG0015/_INDEX.HTM',
		brief: /^IN BRIEF$/i,
		encoding: 'latin1'
	},
	la: {
		base: 'https://www.intratext.com/IXT/LAT0800/',
		index: 'https://www.intratext.com/IXT/LAT0800/_INDEX.HTM',
		brief: /^Compendium$/i,
		encoding: 'latin1'
	}
};

// Two of these pages were written in 1997 and two more in 2004, by different
// tools: attributes come in any order and any case, so every landmark below is
// matched loosely rather than as the literal string one sample happens to show.
/** The rule IntraText draws above a page's footnotes. */
const FOOTNOTE_RULE = /<hr\b[^>]*\bwidth=["']?30%[^>]*>/i;
/** The rule that closes the page header; the text starts below it. */
const HEADER_RULE = /<hr\b[^>]*\bnoshade\b[^>]*>/i;
/** Each footnote opens with its number as a back-link anchor. */
const FOOTNOTE_SPLIT = /<font[^>]*>\s*<b>\s*<a\s+name=\$/i;
/** Where the footnote block gives way to the page's own furniture. */
const FOOTNOTE_END = /<center>|<hr\b[^>]*\bwidth=["']?70%/i;

const STRUCTURAL: [RegExp, number][] = [
	[/^PROLOGUE\b|^PROOEMIUM\b|^FIDEI DEPOSITUM\b/i, 1],
	[/^PARS\b|^PART\b/i, 1],
	[/^SECTIO\b|^SECTION\b/i, 2],
	[/^CAPUT\b|^CHAPTER\b/i, 3],
	[/^ARTICULUS\b|^ARTICLE\b/i, 4],
	[/^PARAGRAPHUS\b|^PARAGRAPH\b/i, 5]
];
const ROMAN = /^[IVX]{1,5}[.)]?\s+\S/;
/** "Article 3" / "PART TWO" alone — the title follows in the next block. */
const BARE_ORDINAL = /^(?:PARS|PART|SECTIO|SECTION|CAPUT|CHAPTER|ARTICULUS|ARTICLE|PARAGRAPHUS|PARAGRAPH)\s+[\w]+[.:]?$/i;

function headingLevel(text: string): number | null {
	if (text.length > 140) return null;
	for (const [re, level] of STRUCTURAL) if (re.test(text)) return level;
	if (ROMAN.test(text)) return 6;
	if (/[A-ZÀ-Ü]/.test(text) && text === text.toUpperCase()) return 6;
	return null;
}

/** The nested `<ul type=square>` above the text: this page's place in the book. */
function breadcrumb(doc: Document): string[] {
	const out: string[] = [];
	for (const li of Array.from(doc.querySelectorAll('ul[type="square"] li'))) {
		const own = Array.from(li.childNodes)
			.filter((n) => n.nodeType === 3 || (n.nodeType === 1 && (n as Element).tagName.toUpperCase() !== 'UL'))
			.map((n) => n.textContent ?? '')
			.join('');
		const text = tidy(own);
		if (text) out.push(text);
	}
	return out;
}

/** Footnote number → text, from the block below the rule. */
function footnotes(tail: string): Map<string, { html: string; text: string }> {
	const notes = new Map<string, { html: string; text: string }>();
	for (const chunk of tail.split(FOOTNOTE_SPLIT).slice(1)) {
		const num = /^[^>]*>(\d{1,4})<\/a>/i.exec(chunk);
		if (!num) continue;
		// Everything after the anchor, up to where the page furniture starts.
		const close = /<\/a>/i.exec(chunk);
		const body = chunk.slice((close?.index ?? 0) + 4).split(FOOTNOTE_END)[0];
		const frag = dom(`<div>${body}</div>`).querySelector('div')!;
		const html = tidyHtml(inline(frag)).replace(/^[)\s]+/, '');
		if (html) notes.set(num[1], { html, text: plain(frag).replace(/^[)\s]+/, '') });
	}
	return notes;
}

function parsePage(html: string, source: Source): { crumbs: string[]; items: RawItem[] } {
	const [head, tail = ''] = html.split(FOOTNOTE_RULE);
	const notes = footnotes(tail);
	const doc = dom(head);
	const crumbs = breadcrumb(doc);

	// The text starts below the un-shaded rule that closes the page header.
	const body = head.split(HEADER_RULE).slice(1).join('');
	const content = dom(`<div>${body}</div>`);

	const items: RawItem[] = [];
	let brief = false;
	for (const p of Array.from(content.querySelectorAll('p'))) {
		const text = plain(p);
		if (!text) continue;

		// The Latin edition prints a full stop after some paragraph numbers.
		const numbered = /^(\d{1,4})\.?\s+/.exec(text);
		if (!numbered) {
			const level = headingLevel(text);
			const bolded = p.querySelector('b, strong');
			const looksBold = !!bolded && plain(bolded).length >= text.length - 2 && text.length < 140;
			// The Latin edition sets its summaries' heading ("Compendium") in the
			// same plain roman as the text around it.
			if (level !== null || looksBold || source.brief.test(text)) {
				brief = source.brief.test(text);
				const previous = items[items.length - 1];
				if (previous?.k === 'h' && BARE_ORDINAL.test(previous.text)) previous.text = `${previous.text.replace(/[.:]$/, '')} ${text}`;
				else items.push({ k: 'h', level: level ?? 6, text });
				continue;
			}
		}

		const used: RawNote[] = [];
		const rendered = tidyHtml(
			inline(p, (marker) => {
				const note = notes.get(marker);
				if (!note) return null;
				const i = used.length;
				used.push({ marker, text: note.text });
				return `<sup data-note="${i}"></sup>`;
			})
		);
		if (!rendered) continue;

		if (numbered) {
			const n = Number(numbered[1]);
			items.push({
				k: 'p',
				n,
				prefix: numbered[0],
				html: tidyHtml(rendered.replace(/^(<em>|<strong>)*\s*\d{1,4}\.?\s+/, (m) => m.replace(/\d{1,4}\.?\s+$/, ''))),
				notes: used,
				...(brief ? { brief: true as const } : {})
			});
		} else {
			items.push({ k: 'q', html: rendered, notes: used });
		}
	}
	return { crumbs, items };
}

export async function parseIntratext(
	lang: 'en' | 'la',
	fetchPage: (url: string, key: string, enc?: 'utf-8' | 'latin1') => Promise<string>
): Promise<{ items: RawItem[] }> {
	const source = INTRATEXT[lang];
	const index = await fetchPage(source.index, `${lang}/_INDEX.HTM`, source.encoding);
	// IntraText publishes each page twice: `_P…` with a concordance link on
	// every single word, `__P…` without. We want the readable one.
	const pages = [...new Set(Array.from(index.matchAll(/href=["']?_{1,2}(P[0-9A-Z]+\.HTM)/gi)).map((m) => m[1]))];
	if (pages.length < 100) throw new Error(`[ccc/${lang}] index listed only ${pages.length} pages`);

	const items: RawItem[] = [];
	let open: string[] = [];
	for (const name of pages) {
		const html = await fetchPage(`${source.base}__${name}`, `${lang}/__${name}`, source.encoding);
		const page = parsePage(html, source);

		// The breadcrumb is this edition's own name for every division above the
		// page, and the only place it spells them out; the body repeats at most
		// the innermost one. Emit the levels that changed since the last page so
		// each language carries its own titles into the structure.
		const chain = page.crumbs.map((text) => ({ text, level: Math.min(headingLevel(text) ?? 6, 6) }));
		const from = chain.findIndex((c, i) => open[i] !== c.text);
		if (from >= 0) for (const c of chain.slice(from)) items.push({ k: 'h', level: c.level, text: c.text });
		open = chain.map((c) => c.text);

		const named = new Set(page.crumbs.map(compare));
		items.push(...page.items.filter((item) => !(item.k === 'h' && named.has(compare(item.text)))));
	}
	return { items };
}

/** Two spellings of one heading — the breadcrumb's and the body's — compared loosely. */
const compare = (text: string) => text.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g, '');
