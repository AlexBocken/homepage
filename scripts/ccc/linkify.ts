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
export function flatten(html: string): { text: string; at: number[] } {
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
	return wrap(html, at, findBible(text, lang), (hit) => {
		if (hit.slug === 'ps') {
			// A psalm carries no verse — the two numberings do not agree on one
			// — so it links to the psalm and stays out of the peeks.
			const chapter = vulgatePsalm(hit.chapter);
			if (chapter === null) {
				tally.dropped.set('ps', (tally.dropped.get('ps') ?? 0) + 1);
				return null;
			}
			tally.psalms++;
			return { className: 'ref', attributes: `data-b="ps/${chapter}"`, print: hit.print };
		}
		if (!exists(hit.slug, hit.chapter, hit.verse)) {
			tally.dropped.set(hit.slug, (tally.dropped.get(hit.slug) ?? 0) + 1);
			return null;
		}
		// The printed form stays on the page; what the peek looks up is the
		// reference spelled out, since a continuation ("7,37-39") names no book
		// and the odd scan glues one to its chapter ("Hebr6,2"). The passage
		// endpoint takes a book as written: `1kor` → `1Kor`.
		const book = hit.slug.replace(/^(\d?)(.)/, (_, n: string, c: string) => n + c.toUpperCase());
		const span = `${hit.chapter},${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
		const passage = `${hit.slug}/${hit.chapter}/${hit.verse}${hit.to ? `-${hit.to}` : ''}`;
		tally.linked++;
		return { className: 'ref', attributes: `data-ref="${book} ${span}" data-b="${passage}"`, print: hit.print };
	});
}

/** Where a citation stands in the flattened text. */
export type Span = { start: number; end: number };

/** What to wrap it in, or null to leave it as it is. */
export type Anchor = { className: string; attributes: string; print?: string | null };

/**
 * Wraps each span in an anchor, back to front so an insertion never moves an
 * offset still to be used. A citation already inside an anchor, or part of a
 * footnote marker, is left alone.
 */
export function wrap<T extends Span>(html: string, at: number[], hits: T[], anchorOf: (hit: T) => Anchor | null): string {
	if (!hits.length) return html;
	let out = html;
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
		if (before.lastIndexOf('<a ') > before.lastIndexOf('</a>')) continue;
		if (before.lastIndexOf('<sup') > before.lastIndexOf('</sup>')) continue;

		const anchor = anchorOf(hit);
		if (!anchor) continue;

		for (const [start, end] of [...runs].reverse()) {
			// Where the scan corrupted the book's name — the German reading room's
			// "Job" for "Joh" — the page shows it corrected; a link to John under
			// a word that says Job would read as our slip, not the scanner's.
			const text = start === runs[0][0] && anchor.print ? out.slice(start, end).replace(/[A-ZÀ-Ü][A-Za-zÀ-ÿ]{0,12}/, anchor.print) : out.slice(start, end);
			out = `${out.slice(0, start)}<a class="${anchor.className}" ${anchor.attributes}>${text}</a>${out.slice(end)}`;
		}
	}
	return out;
}
