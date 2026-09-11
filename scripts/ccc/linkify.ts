/**
 * Scripture citations in the Catechism's own prose and in its footnotes,
 * marked up so the reader can peek them the way it peeks a citation anywhere
 * else on the site.
 *
 * The citation is found in the text, not in the markup, because the editions
 * break it across tags — the Latin sets the book in italics and the chapter
 * outside it, `<em>Io </em>6,51`. So the text is flattened, matched, and the
 * anchor put back around the original span by offset. Which language's Bible
 * the anchor points at is the reader's business, so only the passage travels
 * here: `data-b="lk/4/16"`.
 */
import { findBible } from './refs';

const TAG = /<[^>]+>/g;

/** Plain text of a fragment, and where each of its characters came from. */
function flatten(html: string): { text: string; at: number[] } {
	const text: string[] = [];
	const at: number[] = [];
	let i = 0;
	TAG.lastIndex = 0;
	let tag: RegExpExecArray | null;
	const push = (from: number, to: number) => {
		for (let k = from; k < to; k++) {
			text.push(html[k]);
			at.push(k);
		}
	};
	while ((tag = TAG.exec(html))) {
		push(i, tag.index);
		i = tag.index + tag[0].length;
	}
	push(i, html.length);
	return { text: text.join(''), at };
}

/**
 * Wraps every Scripture citation in an anchor. Citations already inside an
 * anchor or inside a footnote marker are left alone, and nothing else about
 * the markup changes.
 */
export function linkifyBible(html: string): string {
	if (!html) return html;
	const { text, at } = flatten(html);
	const hits = findBible(text);
	if (!hits.length) return html;

	let out = html;
	// Backwards, so an insertion never moves the offsets still to be used.
	for (const hit of [...hits].reverse()) {
		const from = at[hit.start];
		const to = (at[hit.end - 1] ?? from) + 1;
		if (from === undefined) continue;
		const before = out.slice(0, from);
		// Inside an anchor already, or part of a footnote marker: leave it.
		if (before.lastIndexOf('<a ') > before.lastIndexOf('</a>')) continue;
		if (before.lastIndexOf('<sup') > before.lastIndexOf('</sup>')) continue;
		// The printed form stays on the page; what the peek looks up is the
		// reference spelled out, since a continuation ("7,37-39") names no book
		// and the odd scan glues one to its chapter ("Hebr6,2").
		// The reader's passage endpoint takes a book as it is written, so the
		// slug goes back to its capital: `1kor` → `1Kor`.
		const book = hit.slug.replace(/^(\d?)(.)/, (_, n: string, c: string) => n + c.toUpperCase());
		const span = `${hit.chapter},${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
		const passage = `${hit.slug}/${hit.chapter}/${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
		out = `${before}<a class="ref" data-ref="${book} ${span}" data-b="${passage}">${out.slice(from, to)}</a>${out.slice(to)}`;
	}
	return out;
}
