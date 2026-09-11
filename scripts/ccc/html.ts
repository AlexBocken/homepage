/**
 * Turning 1990s HTML into the small inline subset the reader renders.
 *
 * All three sources are hand-era markup — unclosed tags, `<font>` everywhere,
 * Word's `mso-` leftovers — so they go through jsdom rather than a regex, and
 * come out as text with `<em>` and `<strong>` only.
 */
import { JSDOM } from 'jsdom';

export function dom(html: string): Document {
	return new JSDOM(html).window.document;
}

const EMPHASIS = new Set(['I', 'EM', 'CITE']);
const STRONG = new Set(['B', 'STRONG']);

/** Escapes the four characters that matter once the markup is our own. */
function esc(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A node's contents as `<em>`/`<strong>`-only HTML. Superscript footnote
 * markers are handed to `onNote`, which returns the markup to put in their
 * place (or null to drop them).
 */
export function inline(node: Node, onNote?: (marker: string) => string | null): string {
	let out = '';
	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === 3) {
			out += esc(child.textContent ?? '');
			continue;
		}
		if (child.nodeType !== 1) continue;
		const el = child as Element;
		const tag = el.tagName.toUpperCase();
		if (tag === 'SUP') {
			const marker = (el.textContent ?? '').trim();
			const replacement = onNote?.(marker) ?? null;
			if (replacement) out += replacement;
			continue;
		}
		if (tag === 'BR') {
			out += ' ';
			continue;
		}
		const inner = inline(el, onNote);
		// `<i> </i>` between a paragraph number and its first word is the only
		// thing holding them apart on some pages — drop the element, keep the gap.
		if (!inner.trim()) {
			if (inner) out += ' ';
			continue;
		}
		if (EMPHASIS.has(tag)) out += `<em>${inner}</em>`;
		else if (STRONG.has(tag)) out += `<strong>${inner}</strong>`;
		else out += inner;
	}
	return out;
}

/** Collapses the whitespace these pages are full of, including NBSPs. */
export function tidy(text: string): string {
	return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/** A node's plain text, tidied. */
export function plain(node: Node): string {
	return tidy(node.textContent ?? '');
}

/** Nested `<em>`/`<strong>` left empty by dropped children are not worth keeping. */
export function tidyHtml(html: string): string {
	return tidy(html)
		.replace(/<(em|strong)>\s*<\/\1>/g, '')
		.replace(/\s+([,.;:!?])/g, '$1')
		.trim();
}
