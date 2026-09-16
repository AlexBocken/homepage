/**
 * A papal or curial document as vatican.va publishes it today.
 *
 * These pages are not the hand-typed archive the council lives in — they come
 * out of the Vatican's CMS, and the whole document sits in one `div.testo`.
 * Inside it the shape is close enough to the council's that
 * `parseCouncil` does the work: articles are recognised by their number in
 * running text, notes by the heading above them or by the bracket around
 * their number, and neither by the markup.
 *
 * Three things do differ, and they are what this file is:
 *
 *  - the page frame is enormous, so the document has to be cut out of it
 *    first, or the navigation counts as prose;
 *  - the Latin pages set the article number in bold, `<b>1.</b>`, which the
 *    council never did — and a number inside a tag is not at the head of the
 *    text, so it would be kept as if it were a word;
 *  - **an absent translation is served as a page, not as a 404.** German
 *    `Rerum novarum` is a German frame around an empty `div.testo`. Only
 *    reading it tells you the text is not there.
 */
import { dom, plain } from '../ccc/html';
import { parseCouncil, type Correction, type ParsedDocument } from '../council/parse';

/**
 * A paragraph that opens with its article number set in bold — `<b>12.</b>`
 * on the Latin pages, and on the German ones the number together with the
 * article's own heading, `<b>1. Die Offenbarung des Erbarmens</b>`. Either
 * way the number is inside a tag, and a number inside a tag is not at the
 * head of the text where the article recogniser looks for it.
 */
const BOLD_NUMBER = /^\s*\d{1,3}\s*[.)]/;

/**
 * Where the document sits, in the order the site has used over the years.
 * `div.testo` is the CMS; `.vaticanrichtext` is the half-converted archive
 * (the First Vatican Council has one page in each); and the Congregation's
 * pages are still bare, with the text loose in the body.
 */
const CONTAINERS = ['.testo', '.vaticanrichtext', 'body'];

/** What a superscript holds where it is a footnote marker: `12`, or `[12]`. */
const MARKER_TEXT = /^\s*[[(]?(\d{1,3})[\])]?\s*$/;

/**
 * The document, cut out of the page frame and with its bold article numbers
 * turned back into text — or null where this language has only the frame.
 */
export function parseMagisterium(html: string, corrections: Correction[] = [], expected = 0): ParsedDocument | null {
	const doc = dom(html);
	let testo: Element | null = null;
	for (const selector of CONTAINERS) {
		const found = doc.querySelector(selector);
		// A frame with nothing in it: vatican.va answers 200 for every language,
		// whether or not it has the text.
		if (found && found.querySelectorAll('p').length >= 5) { testo = found; break; }
	}
	if (!testo) return null;

	const paragraphs = testo.querySelectorAll('p');

	// A footnote marker is `(12)` on the pages the council parser was written
	// for, but a superscript on these — `<sup>[1]</sup>` on the Congregation's,
	// a bare `<sup>1</sup>` on the German ones — and a superscript is thrown
	// away with the rest of the markup. Written out as `(12)`, it survives, and
	// so does the note paragraph that opens with the same superscript.
	for (const sup of testo.querySelectorAll('sup')) {
		const marker = MARKER_TEXT.exec(sup.textContent ?? '');
		if (marker) sup.replaceWith(doc.createTextNode(`(${marker[1]})`));
	}

	// `<b>1.</b> CENTESIMUS ANNUS …` — unwrap it, so the number stands at the
	// head of the paragraph's text where the article recogniser looks for it.
	for (const p of paragraphs) {
		const first = p.firstElementChild;
		if (!first) continue;
		const tag = first.tagName.toUpperCase();
		if (tag !== 'B' && tag !== 'STRONG') continue;
		if (!BOLD_NUMBER.test(first.textContent ?? '')) continue;
		first.replaceWith(doc.createTextNode(first.textContent ?? ''));
	}

	const title = doc.querySelector('title')?.textContent?.trim() ?? '';
	// Read before the front matter is cut away, because it is what it is taken
	// from.
	const subtitle = subtitleOf(paragraphs, corrections);
	for (const p of frontMatter(paragraphs)) p.remove();

	const parsed = parseCouncil(`<html><head><title>${escapeText(title)}</title></head><body>${testo.innerHTML}</body></html>`, corrections, expected);
	return { ...parsed, title, subtitle, notes: cited(parsed) };
}

/**
 * The matter above the document: the pope's name, what kind of act this is,
 * the address to the bishops and the greeting that closes it.
 *
 * It has to go, and not merely be ignored. Several of these documents leave
 * their opening article unnumbered and begin counting at 2 — as two council
 * decrees do — and the parser then reads whatever stands before the "2." as
 * article 1. Where that is the title block, article 1 of `Humanae vitae`
 * comes out as "ENCYCLICAL LETTER HUMANAE VITAE OF THE SUPREME PONTIFF …".
 *
 * Only the run at the very top is cut, and only down to the first numbered
 * paragraph, so an article that happens to shout is never mistaken for it.
 */
function frontMatter(paragraphs: ArrayLike<Element>): Element[] {
	const out: Element[] = [];
	for (const p of Array.from(paragraphs)) {
		const text = plain(p);
		// The document has begun: either at its first article, or at the heading
		// standing over it, which these pages number in Roman.
		if (NUMBERED.test(text) || ROMAN.test(text)) break;
		if (!text) { out.push(p); continue; }
		if (!isFrontMatter(text)) break;
		out.push(p);
	}
	return out;
}

/** The address and the greeting, in the three languages these are printed in. */
const ADDRESS = /venerab|ehrwürdig|fratribus|fratres|brethren|brüder|patriarch|carissim|dilect|filii|filiae|salutem|benedictionem|segen|blessing/i;

/**
 * A line of the front matter: the address, or a line set in capitals — which
 * is how every one of these pages prints its own title and the pope's name.
 */
function isFrontMatter(text: string): boolean {
	if (ADDRESS.test(text)) return true;
	const letters = text.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4) return true;
	const upper = text.replace(/[^\p{Lu}]/gu, '').length;
	return upper / letters.length > 0.7;
}

/**
 * The notes the text really refers to.
 *
 * vatican.va's German and English translations of the encyclicals mostly drop
 * the apparatus, and a page that has no notes often ends on something that
 * looks like one all the same — the year of an anniversary, a numbered line in
 * a closing prayer. `parseCouncil` already throws away a marker with no note
 * behind it; this is the other half of the same rule, and between them a
 * reader is never shown half a footnote.
 */
function cited({ articles, notes }: ParsedDocument): ParsedDocument['notes'] {
	const marked = new Set<number>();
	for (const article of articles) for (const m of article.html.matchAll(/data-fn="(\d+)"/g)) marked.add(Number(m[1]));
	const found = notes.filter((note) => marked.has(note.k));
	// A page that prints its apparatus answers most of its markers. A page that
	// prints none often ends on something shaped like a note all the same — the
	// year of an anniversary, a numbered line in a closing prayer — and half a
	// dozen of those are not an apparatus, they are noise.
	return marked.size && found.length < marked.size / 2 ? [] : found;
}

/** A paragraph that opens an article: "12." — or "12)" on the German pages. */
const NUMBERED = /^\d{1,3}\s*[.)]/;
/** "I. DAS ERBE" — the heading over the first article, not the front matter. */
const ROMAN = /^[IVXLC]+\.\s/;

/**
 * What the page calls the document, taken from the matter above its first
 * article. The `meta` description is no use: it is a list of search keywords.
 *
 * The front matter is the pope's name, the incipit, what the document is
 * about, and the address to the bishops. Only the third is wanted, and it is
 * the one line long enough to say something and short enough not to be prose.
 */
function subtitleOf(paragraphs: ArrayLike<Element>, corrections: Correction[]): string {
	const opens = corrections.find((c) => c.article === 1)?.opens;
	const lines: string[] = [];
	for (const p of Array.from(paragraphs)) {
		const text = plain(p);
		if (!text) continue;
		if (NUMBERED.test(text)) break;
		if (opens && text.startsWith(opens)) break;
		// One `<p>` can hold the whole head of the document, broken by `<br>`.
		for (const line of text.split(/\s{2,}|(?<=[a-zà-ÿ])(?=[A-ZÀ-Ü]{4})/)) lines.push(line.trim());
	}
	const candidates = lines.filter((l) => l.length >= 10 && l.length <= 120 && !/[.;:!?]\s/.test(l) && !/^\[/.test(l));
	// The address to the bishops, and the greeting that closes it, are the two
	// things in the front matter long enough to be mistaken for a description.
	const said = candidates.filter((l) => !ADDRESS.test(l));
	return said.sort((a, b) => b.length - a.length)[0] ?? '';
}

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
