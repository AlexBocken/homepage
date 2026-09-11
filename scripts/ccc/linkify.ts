/**
 * Scripture citations in the Catechism's own prose and in its footnotes,
 * marked up so the reader can peek them the way it peeks a citation anywhere
 * else on the site.
 *
 * The citation is found in the text, not in the markup, because the editions
 * break one across tags — the Latin sets the book in italics and the chapter
 * outside it, `<em>Io </em>6,51`. So the text is flattened, matched, and the
 * anchor put back around the original span by offset. Which language's Bible
 * the anchor points at is the reader's business, so only the passage travels
 * here: `data-b="lk/4/16"`.
 *
 * A citation is only linked if the verse is really there — the editions' scans
 * produce a handful that are not. The Psalms are the one systematic exception:
 * all three editions cite the Hebrew numbering and every text on this site is
 * Vulgate-numbered, so a psalm is linked to the psalm and not to a verse (see
 * `psalms.ts`). Such an anchor carries no `data-ref` and so opens no peek,
 * there being no verse we could honestly show.
 */
import { findBible } from './refs';
import { vulgatePsalm } from './psalms';
import type { CccLang } from '../../src/lib/faith/cccTypes';

const TAG = /<[^>]+>/g;

/** Whether a verse is really in the text this language reads. */
export type Exists = (slug: string, chapter: number, verse: number) => boolean;

export type Tally = { linked: number; psalms: number; dropped: Map<string, number> };

export const newTally = (): Tally => ({ linked: 0, psalms: 0, dropped: new Map() });

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
export function linkifyBible(html: string, lang: CccLang, exists: Exists, tally: Tally): string {
	if (!html) return html;
	const { text, at } = flatten(html);
	const hits = findBible(text, lang);
	if (!hits.length) return html;

	let out = html;
	// Backwards, so an insertion never moves the offsets still to be used.
	for (const hit of [...hits].reverse()) {
		// A citation can straddle a tag — the Latin sets the book in italics and
		// the chapter outside it — so it is wrapped run by run rather than in one
		// anchor that would open inside an element and close outside it.
		const runs: [number, number][] = [];
		for (let i = hit.start; i < hit.end; i++) {
			const h = at[i];
			if (h === undefined) continue;
			const last = runs[runs.length - 1];
			if (last && last[1] === h) last[1] = h + 1;
			else runs.push([h, h + 1]);
		}
		if (!runs.length) continue;

		const before = out.slice(0, runs[0][0]);
		// Inside an anchor already, or part of a footnote marker: leave it.
		if (before.lastIndexOf('<a ') > before.lastIndexOf('</a>')) continue;
		if (before.lastIndexOf('<sup') > before.lastIndexOf('</sup>')) continue;

		let attributes: string;
		if (hit.slug === 'ps') {
			const chapter = vulgatePsalm(hit.chapter);
			if (chapter === null) {
				tally.dropped.set('ps', (tally.dropped.get('ps') ?? 0) + 1);
				continue;
			}
			tally.psalms++;
			attributes = `data-b="ps/${chapter}"`;
		} else {
			if (!exists(hit.slug, hit.chapter, hit.verse)) {
				tally.dropped.set(hit.slug, (tally.dropped.get(hit.slug) ?? 0) + 1);
				continue;
			}
			// The printed form stays on the page; what the peek looks up is the
			// reference spelled out, since a continuation ("7,37-39") names no
			// book and the odd scan glues one to its chapter ("Hebr6,2"). The
			// passage endpoint takes a book as written: `1kor` → `1Kor`.
			const book = hit.slug.replace(/^(\d?)(.)/, (_, n: string, c: string) => n + c.toUpperCase());
			const span = `${hit.chapter},${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
			const passage = `${hit.slug}/${hit.chapter}/${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
			tally.linked++;
			attributes = `data-ref="${book} ${span}" data-b="${passage}"`;
		}

		for (const [start, end] of [...runs].reverse()) {
			// Where the scan corrupted the book's name — the German reading room's
			// "Job" for "Joh" — the page shows it corrected; a link to John under
			// a word that says Job would read as our slip, not the scanner's.
			const text = start === runs[0][0] && hit.print ? out.slice(start, end).replace(/[A-ZÀ-Ü][A-Za-zÀ-ÿ]{0,12}/, hit.print) : out.slice(start, end);
			out = `${out.slice(0, start)}<a class="ref" ${attributes}>${text}</a>${out.slice(end)}`;
		}
	}
	return out;
}
