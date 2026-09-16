/**
 * A council document as vatican.va publishes it.
 *
 * Sixteen documents in three languages is forty-eight pages typed up over
 * several years by different hands, and they agree on very little:
 *
 *  - the article's number is plain text in German and English, `<b>` in the
 *    Latin, and sometimes a paragraph of its own with the text following after
 *    (German Sacrosanctum Concilium 22);
 *  - it is written "1.", and in the Latin Gravissimum educationis "1 .";
 *  - Christus Dominus and Perfectae caritatis leave their first article
 *    unnumbered and start counting at 2;
 *  - a footnote marker is "(12)" on some pages and "[12]" on others;
 *  - the notes are numbered "(12)" in German and Latin but "12." in English,
 *    which is exactly how an article begins — so they are told apart by the
 *    heading above them, not by their shape.
 *
 * So nothing here reads the markup for structure. The paragraph's text
 * decides, and the numbers have to run 1, 2, 3 … or what looks like an article
 * is something else that merely opens with a figure.
 */
import { dom, inline, plain, tidyHtml } from '../ccc/html';
import type { CouncilArticle, CouncilNote } from '../../src/lib/faith/councilTypes';

/**
 * "12.", "12 .", "12)", and on several pages simply "12" with no point at all,
 * at the head of a paragraph — perhaps as the whole of it.
 */
const ARTICLE = /^(\d{1,3})\s*[.)]?(?:\s+|$)/;
/** "(12)" or "[12]" at the head of a paragraph: note twelve. */
const BRACKETED = /^[[(](\d{1,3})[\])]\s*/;
/** The heading the notes stand under, in the three languages. */
const NOTES_HEADING = /^(anmerkungen|notes?|notae|note)\b/i;
/** A marker in the running text, in either of the two houses' styles. */
const MARKER = /[[(](\d{1,3})[\])]/g;

export type ParsedDocument = { title: string; subtitle: string; articles: CouncilArticle[]; notes: CouncilNote[] };

/** An article the page numbers wrongly or not at all: its opening words, and which it is. */
export type Correction = { article: number; opens: string };

/** Short, no sentence in it: a heading over what follows, not prose. */
const isHeading = (text: string) => text.length > 0 && text.length < 90 && !/[.:;]\s/.test(text.replace(/^[IVX]+\.\s/, '')) && !text.endsWith('.');

/** Footnote markers are bare "(12)" or "[12]" in the text; here they become markers. */
const markers = (html: string) => html.replace(MARKER, (_, k: string) => `<sup class="fn" data-fn="${k}">${k}</sup>`);

export function parseCouncil(html: string, corrections: Correction[] = [], expected = 0): ParsedDocument {
	const doc = dom(html);
	const title = plain(doc.querySelector('title') ?? doc.createElement('title'));
	const subtitle = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.replace(title, '').trim() ?? '';

	const articles: CouncilArticle[] = [];
	const notes: CouncilNote[] = [];
	/** Prose before the first numbered article: the unnumbered opening article. */
	const preamble: string[] = [];
	let heading: string | undefined;
	let last = 0;
	let inNotes = false;

	const add = (html: string) => {
		if (!html) return;
		if (!articles.length) {
			preamble.push(markers(html));
			return;
		}
		const current = articles[articles.length - 1];
		current.html = `${current.html} ${markers(html)}`.trim();
	};

	for (const p of Array.from(doc.querySelectorAll('p'))) {
		const text = plain(p);
		if (!text) continue;

		if (!inNotes && isHeading(text) && NOTES_HEADING.test(text)) {
			inNotes = true;
			continue;
		}
		if (inNotes) {
			const numbered = BRACKETED.exec(text) ?? ARTICLE.exec(text);
			const body = tidyHtml(inline(p)).replace(BRACKETED, '').replace(ARTICLE, '');
			if (numbered && body) notes.push({ k: Number(numbered[1]), html: body });
			continue;
		}
		// Several pages head their notes with nothing at all. Two things give them
		// away: the Latin's bracketed "(1)", and — once the document has all the
		// articles it is known to have — a number that starts counting again.
		const restart = ARTICLE.exec(text);
		if (expected && last >= expected && restart && Number(restart[1]) <= last && !notes.length) {
			inNotes = true;
			const body = tidyHtml(inline(p)).replace(ARTICLE, '');
			if (body) notes.push({ k: Number(restart[1]), html: body });
			continue;
		}
		// A bracketed "(1)" opens the notes — but only once the document has all
		// the articles it is known to have. Some pages carry a footnote marker
		// at the head of a paragraph, and that is a marker, not the note.
		const bracketed = BRACKETED.exec(text);
		if (bracketed && Number(bracketed[1]) === 1 && !notes.length && articles.length > 1 && (!expected || last >= expected)) {
			inNotes = true;
			const body = tidyHtml(inline(p)).replace(BRACKETED, '');
			if (body) notes.push({ k: 1, html: body });
			continue;
		}

		// An article the page mis-numbers is recognised by its opening words —
		// after any number it does carry, since the fault may be that number.
		const opening = text.replace(ARTICLE, '');
		const corrected = corrections.find((c) => opening.startsWith(c.opens));
		if (corrected) {
			last = corrected.article;
			articles.push({ n: last, html: markers(tidyHtml(inline(p)).replace(ARTICLE, '')), ...(heading ? { heading } : {}) });
			heading = undefined;
			continue;
		}

		const article = ARTICLE.exec(text);
		// The numbers run straight through. A document that leaves its opening
		// article unnumbered starts the count at 2, and that opening becomes
		// article 1 once the whole document is in.
		const continues = article && (Number(article[1]) === last + 1 || (last === 0 && Number(article[1]) === 2));
		if (continues) {
			last = Number(article[1]);
			const body = tidyHtml(inline(p)).replace(ARTICLE, '');
			articles.push({ n: last, html: markers(body), ...(heading ? { heading } : {}) });
			heading = undefined;
			continue;
		}

		if (isHeading(text)) heading = text;
		else add(tidyHtml(inline(p)));
	}

	// Fold the unnumbered opening into article 1 where the count began at 2.
	if (preamble.length && articles[0]?.n === 2) articles.unshift({ n: 1, html: preamble.join(' ').trim() });

	// Some Latin pages carry the text and the signatures but never the notes.
	// A marker with nothing behind it is worse than no marker.
	const have = new Set(notes.map((n) => n.k));
	for (const article of articles) article.html = article.html.replace(/<sup class="fn" data-fn="(\d+)">\d+<\/sup>/g, (whole, k: string) => (have.has(Number(k)) ? whole : ''));

	return { title, subtitle, articles, notes };
}
