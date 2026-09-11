/**
 * The 1983 Code of Canon Law, from vatican.va — 1752 canons, cited 143 times
 * by the Catechism and 26 more through its eastern counterpart.
 *
 * The three editions are published quite differently: German across 251 pages
 * of a few canons each, English across 294, and the Latin as seven — one per
 * book. What they share is the only thing that matters here: every canon opens
 * "Can. 1752 —", and the paragraphs that follow it, "§ 2." and the rest,
 * belong to it until the next one starts.
 */
import { dom, inline, plain, tidyHtml } from '../ccc/html';
import type { Canon, CouncilLang } from '../../src/lib/faith/councilTypes';

const INDEX: Record<CouncilLang, string> = {
	de: 'https://www.vatican.va/archive/cod-iuris-canonici/cic_index_ge.html',
	en: 'https://www.vatican.va/archive/cod-iuris-canonici/cic_index_en.html',
	la: 'https://www.vatican.va/archive/cod-iuris-canonici/cic_index_la.html'
};

/** The highest canon of the Code; the importer checks that none is missing. */
export const LAST_CANON = 1752;

/** How far ahead of the last canon read a number may be and still open one. */
const AHEAD = 30;

/**
 * "Can. 1 —", however the page dashes it — and two German pages print the dash
 * on the wrong side, "Can. — 193". What follows the number settles whether a
 * canon is beginning or merely being referred to: a canon opens with "§ 1", a
 * numbered clause or a capital letter, while the prose says "gemäss Can. 1439
 * etwas anderes bestimmt" and carries straight on in lower case. Between the
 * two stands whatever the typesetter felt like — "Can. 87*", "Can. 139 —.".
 */
const CANON = /^Can\.\s*[—–-]?\s*(\d{1,4})[\s.:*†‡•—–-]*(?=$|[§"„“('\d]|\p{Lu})/u;
/**
 * An editorial note tacked onto the end of a canon, inside the canon's own
 * paragraph: the motu proprio that amended it, in brackets. The canons
 * themselves put nothing in brackets but a cross-reference to another canon.
 */
const TRAILING =
	/\s*(?:[[(]\s*(?:<[^>]+>\s*)*(?:vgl\.|cf[.:]|siehe|franziskus|francis(?:cus)?\b|papst|apostolisches schreiben|apostolic letter|litterae apostolicae|rescriptum|motu proprio)|(?:\(cann?\.[^)]*\)\s*)?(?:cf[.:]|vgl\.)\s*(?:<[^>]+>\s*)*(?:litterae apostolicae|apostolic letter|apostolisches schreiben|motu proprio))[\s\S]*$/i;

/** A canon with any such note taken off the end. */
export const withoutEditorial = (html: string) => html.replace(TRAILING, '').trim();

/** The pieces of that opening, to take it off the front of the canon's text. */
const OPENING = [/^\s*Can\.\s*[—–-]?\s*/, /^\s*\d{1,4}\s*/, /^[\s.:*†‡•—–-]+/];
/**
 * The same, wherever it stands. A canon does not always open its paragraph:
 * an editorial note about a later amendment, or simply the previous canon, can
 * come first with only a line break between. Lower-case "can. 194" is a
 * cross-reference and never a heading, which is what keeps this honest.
 */
const CANON_ANYWHERE = /(?:^|(?<=[\s>]))Can\.\s*[—–-]?\s*\d{1,4}[\s.:*†‡•—–-]*(?=$|[§"„“('\d]|\p{Lu})/gu;

/**
 * The editorial apparatus vatican.va prints under a canon it has amended: a
 * rule of underscores, the legend for the little "n" that marks a new version,
 * the motu proprio that made the change, and sometimes the superseded text.
 */
const EDITORIAL =
	/^[[(]?\s*(_{3,}|n?\s*:\s*(indicates|indica|hinweis|indique)|(cf|vgl)[.:]|(die )?(urspr[üu]ngliche|earlier|previous|precedente)|(for|f[üu]r) cann?\.|franziskus|francis(cus)?\b|litterae apostolicae|apostolisches schreiben|apostolic letter|rescriptum ex audientia|motu proprio)/i;

/**
 * The divisions of the Code, in the three languages. A heading tells us where
 * a canon stands; the keyword tells us how deep.
 */
const LEVELS: [RegExp, number][] = [
	[/^(BUCH|BOOK|LIBER)\b/i, 0],
	[/^(TEIL|PART|PARS)\b/i, 1],
	[/^(ABSCHNITT|SEKTION|SECTION|SECTIO)\b/i, 2],
	[/^(TITEL|TITLE|TITULUS)\b/i, 3],
	[/^(KAPITEL|CHAPTER|CAPUT)\b/i, 4],
	[/^(ARTIKEL|ARTICLE|ARTICULUS)\b/i, 5]
];

/**
 * The pages the Code is published across, in canon order.
 *
 * German splits it over 251 pages of a few canons each and English over 118;
 * the Latin is seven, one per book. The page's own name says which canons are
 * on it — `cic_libro4_cann1055-1065_ge.html` — so it orders them, rather than
 * the index's link order, which wanders into the sub-headings.
 */
export function cicPages(lang: CouncilLang, indexHtml: string): string[] {
	const hrefs = [...indexHtml.matchAll(/href="([^"#]+\.html)/g)].map((m) => m[1]);
	const unique = [...new Set(hrefs)].map((h) => new URL(h, INDEX[lang]).toString());
	if (lang === 'la') {
		const books = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
		return unique
			.filter((u) => /cic_liber[IVX]+_la\.html$/.test(u))
			.sort((a, b) => books.indexOf(/liber([IVX]+)_/.exec(a)![1]) - books.indexOf(/liber([IVX]+)_/.exec(b)![1]));
	}
	const first = (url: string) => Number(/cann?(\d+)/.exec(url)?.[1] ?? 0);
	return unique.filter((u) => first(u) > 0).sort((a, b) => first(a) - first(b));
}

export const cicIndexUrl = (lang: CouncilLang) => INDEX[lang];

/**
 * Book VI was rewritten in 2021, and whoever pasted the new penal law in laid
 * it out as a table — one canon per cell — while the rest of the Code is
 * paragraphs. Cells become paragraphs so there is only one shape to read.
 */
const untable = (html: string) =>
	html
		.replace(/<t[dh]\b[^>]*>/gi, '<p>')
		.replace(/<\/t[dh]>/gi, '</p>')
		// The rows and the table itself have to go with them: a paragraph left
		// inside a <table> with no cell around it is foster-parented out by the
		// HTML parser, and the canon in it goes missing without a word.
		.replace(/<\/?(?:table|thead|tbody|tfoot|tr|caption|colgroup|col)\b[^>]*>/gi, '<div></div>');

/**
 * The seven books of the Code, by the canons they run over. The pages head
 * them inconsistently — the English Book IV calls itself "LIBER IV. DE
 * ECCLESIAE MUNERE SANCTIFICANDI" on some of its pages and "BOOK IV. FUNCTION
 * OF THE CHURCH" on others — so the book a canon stands in is settled here and
 * only the divisions below it are read off the page.
 */
export const BOOKS: { last: number; title: Record<CouncilLang, string> }[] = [
	{ last: 203, title: { de: 'Buch I · Allgemeine Normen', en: 'Book I · General Norms', la: 'Liber I · De normis generalibus' } },
	{ last: 746, title: { de: 'Buch II · Volk Gottes', en: 'Book II · The People of God', la: 'Liber II · De populo Dei' } },
	{ last: 833, title: { de: 'Buch III · Verkündigungsdienst der Kirche', en: 'Book III · The Teaching Function of the Church', la: 'Liber III · De Ecclesiae munere docendi' } },
	{ last: 1253, title: { de: 'Buch IV · Heiligungsdienst der Kirche', en: 'Book IV · The Sanctifying Function of the Church', la: 'Liber IV · De Ecclesiae munere sanctificandi' } },
	{ last: 1310, title: { de: 'Buch V · Kirchenvermögen', en: 'Book V · The Temporal Goods of the Church', la: 'Liber V · De bonis Ecclesiae temporalibus' } },
	{ last: 1399, title: { de: 'Buch VI · Strafbestimmungen in der Kirche', en: 'Book VI · Penal Sanctions in the Church', la: 'Liber VI · De sanctionibus poenalibus in Ecclesia' } },
	{ last: 1752, title: { de: 'Buch VII · Prozesse', en: 'Book VII · Processes', la: 'Liber VII · De processibus' } }
];

/** The book a canon stands in, in the language it is being read in. */
export const bookOf = (n: number, lang: CouncilLang) => (BOOKS.find((b) => n <= b.last) ?? BOOKS[BOOKS.length - 1]).title[lang];

/** A division's line, without the range of canons the page prints after it. */
const heading = (text: string) =>
	text
		.replace(/\s*[[(]\s*Cann?\.[^)\]]*[)\]]\s*$/i, '')
		// The English pages often print the Latin heading after the English one.
		.replace(/\s+(LIBER|PARS|TITULUS|CAPUT|ARTICULUS)\s+[IVX]+\b.*$/, '')
		.replace(/[.:]\s*$/, '')
		.trim();

/** Block elements, whose company a stray line of text is not keeping. */
const BLOCK = new Set(['P', 'DIV', 'TABLE', 'TBODY', 'TR', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BR', 'HR']);

/** Elements that hold blocks. Everything else is markup around a line of text. */
const HOLDS_BLOCKS = new Set(['BODY', 'DIV', 'P', 'BLOCKQUOTE', 'CENTER', 'TABLE', 'TBODY', 'TR', 'TD', 'TH']);

/**
 * Canon 1330 stands outside any paragraph in the German and English Book VI —
 * a stray line between two closing tags. Runs of loose text like that get a
 * paragraph of their own, so the reader below sees every canon the same way.
 */
function wrapOrphans(doc: Document): void {
	for (const parent of Array.from(doc.querySelectorAll('body, body *'))) {
		// Only inside something that holds blocks in the first place. An <i> with
		// line breaks in it is emphasis running over three lines, not a container,
		// and wrapping inside it would bury the canon's opening words in a
		// paragraph that holds another paragraph.
		if (!HOLDS_BLOCKS.has(parent.tagName)) continue;
		// And only where blocks and loose text are mixed.
		if (!Array.from(parent.children).some((c) => BLOCK.has(c.tagName))) continue;
		let run: ChildNode[] = [];
		const flush = () => {
			if (run.some((n) => n.textContent?.trim())) {
				const p = doc.createElement('p');
				run[0].before(p);
				for (const node of run) p.append(node);
			}
			run = [];
		};
		for (const node of Array.from(parent.childNodes)) {
			if (node.nodeType === 1 && BLOCK.has((node as Element).tagName)) flush();
			else run.push(node);
		}
		flush();
	}
}

/** Reads one page of the Code onto the canons collected so far. */
export function parseCanons(html: string, into: Map<number, Canon>, where: string[], startsAt?: number): void {
	const doc = dom(untable(html));
	wrapOrphans(doc);
	let current: Canon | null = null;
	/** A division whose title, on most pages, stands on the line below it. */
	let titling = -1;
	// Pages come in canon order, and so do the canons on them. The German and
	// English page names say which canons are on them — `cic_libro4_cann1055…`
	// — which is the surer footing where a page has one.
	let highest = Math.max(startsAt ? startsAt - 1 : 0, into.size ? Math.max(...into.keys()) : 0);
	// The next canon is never far ahead: pages hold a handful each, and Book VI's
	// 2021 rewrite left no gap wider than a few. A number much further on is a
	// cross-reference in the prose — "gemaess Can. 1290" — dressed as an opening.
	const opens = (n: number) => n > highest && n <= highest + AHEAD;

	for (const block of Array.from(doc.querySelectorAll('p'))) {
		// After wrapping, a paragraph that still holds paragraphs is a container
		// — a table cell, once — and its text is read from those.
		if (block.querySelector('p')) continue;
		// The little "n" that marks an amended canon — superscript on some pages,
		// and on others a lone brown letter between the number and the text.
		for (const sup of Array.from(block.querySelectorAll('sup'))) sup.remove();
		for (const mark of Array.from(block.querySelectorAll('font, b, i'))) if (mark.textContent?.trim() === 'n') mark.remove();
		for (const p of split(doc, block)) {
		const text = plain(p);
		if (!text) continue;

		const level = LEVELS.find(([re]) => re.test(text))?.[1];
		if (level !== undefined && text.length < 200) {
			where.length = level;
			where[level] = heading(text);
			titling = level;
			current = null;
			continue;
		}
		// "BUCH I" on one line, "ALLGEMEINE NORMEN" on the next: one division.
		if (titling >= 0 && !current && text.length < 90 && !CANON.test(text) && !EDITORIAL.test(text)) {
			where[titling] = `${where[titling]} ${heading(text)}`.trim();
			titling = -1;
			continue;
		}
		titling = -1;

		if (EDITORIAL.test(text)) {
			// A footer about a later amendment — the underscore rule, the little "n:
			// indicates a new version", the motu proprio it came from, and on some
			// pages the superseded text under "[Earlier version]". None of it is the
			// canon, and it runs until the next one begins.
			current = null;
			continue;
		}

		const canon = CANON.exec(text);
		// The canons run upwards, page by page. A number that runs backwards is a
		// cross-reference, or the superseded text of a canon already read.
		if (canon && opens(Number(canon[1]))) {
			highest = Number(canon[1]);
			stripOpening(p);
			current = { n: highest, html: tidyHtml(inline(p)), where: where.filter(Boolean) };
			into.set(highest, current);
			continue;
		}

		// "§ 2." and the rest of a canon's paragraphs.
		if (current && /^§/.test(text)) current.html = `${current.html}<br />${tidyHtml(inline(p))}`;
		else if (current && !/^[A-ZÄÖÜ\s]{8,}$/.test(text)) current.html = `${current.html} ${tidyHtml(inline(p))}`.trim();
		}
	}
}

/**
 * A paragraph, cut into one piece per canon that starts inside it. A paragraph
 * that holds no canon at all comes back whole, which is the usual case.
 */
function split(doc: Document, block: Element): Element[] {
	const html = block.innerHTML;
	const cuts = [...html.matchAll(CANON_ANYWHERE)].map((m) => m.index!).filter((i) => i > 0 && starts(html.slice(0, i)));
	if (!cuts.length) return [block];
	const pieces: Element[] = [];
	for (const [i, at] of [0, ...cuts].entries()) {
		const piece = doc.createElement('p');
		piece.innerHTML = html.slice(at, cuts[i] ?? html.length);
		pieces.push(piece);
	}
	return pieces;
}

/**
 * Takes "Can. 112: —" off the front of a canon, wherever the page has put the
 * tags: the number is bold on one page, a link on another, and the dash after
 * it belongs to neither.
 */
function stripOpening(p: Element): void {
	const [prefix, number, separators] = OPENING;
	const walker = p.ownerDocument.createTreeWalker(p, 4);
	let step = 0;
	for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
		for (const part of [prefix, number, separators]) {
			if (step > [prefix, number, separators].indexOf(part)) continue;
			const cut = part.exec(node.data);
			if (!cut) break;
			node.data = node.data.slice(cut[0].length);
			// The separators are the tail of the opening and may run on over
			// several nodes — "Can. 695" bold, then " — " beside it.
			step = part === separators ? 2 : step + 1;
		}
		// Whatever is left in this node is the canon itself.
		if (node.data.trim()) return;
	}
}

/**
 * Whether a canon may begin after this much of a paragraph — that is, after a
 * line break or the end of a sentence. Mid-sentence it is being cited, not
 * begun: the German canon 1438 runs "…falls nicht Can. 1439 Platz greift", and
 * that capital P is otherwise indistinguishable from a canon's first word.
 */
function starts(before: string): boolean {
	const trimmed = before.replace(/(?:\s|<\/(?:i|b|em|strong|font|a|span)>)+$/gi, '');
	return /<br\s*\/?>$/i.test(trimmed) || /[.!?:;\]]$/.test(trimmed);
}
