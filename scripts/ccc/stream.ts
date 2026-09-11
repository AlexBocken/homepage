/**
 * The one shape every source parser produces: the Catechism as a flat stream of
 * headings, numbered paragraphs and the quotations that hang off them, in
 * reading order. Sectioning happens afterwards, from the German stream, because
 * paragraph numbers are the only thing all three editions agree on exactly.
 */

/**
 * A footnote as its edition wrote it; `marker` is null where we number it
 * ourselves. `text` is what the citation parser reads, `html` what the reader
 * shows — the two differ where a work's title is set in italics.
 */
export type RawNote = { marker: string | null; text: string; html?: string };

export type RawItem =
	| { k: 'h'; level: number; text: string }
	/** `prefix` is the number as the page printed it ("1286 ", "146. "), kept so
	 * a false positive can be put back into the text it was taken from. */
	| { k: 'p'; n: number; html: string; notes: RawNote[]; brief?: true; prefix: string }
	| { k: 'q'; html: string; notes: RawNote[] };

/** Paragraph numbers present in a stream, for the importer's coverage check. */
export function numbersIn(items: RawItem[]): Set<number> {
	return new Set(items.flatMap((i) => (i.k === 'p' ? [i.n] : [])));
}

/**
 * Repairs the two ways these conversions lose a paragraph boundary, both seen
 * in the English edition and harmless to apply everywhere:
 *
 *  - the next paragraph's number ends up inside the previous paragraph, after a
 *    `<br>` the converter dropped ("… the common good. <br> 2436 Unemployment");
 *  - a paragraph is broken across several `<p>` mid-sentence, so its tail
 *    arrives looking like an unnumbered block quotation.
 *
 * Only the number that comes next in sequence is ever split on, and a tail is
 * only re-joined when it begins lower-case after something that did not end.
 */
const UNFINISHED = /[a-zA-ZÀ-ÿ,;]$|[a-zA-ZÀ-ÿ,;]<\/(?:em|strong)>$/;
const CONTINUES = /^(?:<(?:em|strong)>)*[a-zà-ÿ]/;

export function repair(items: RawItem[], onDemote?: (n: number, text: string) => void): RawItem[] {
	const out: RawItem[] = [];
	let last = 0;
	for (const item of items) {
		// The Catechism runs 1…2865 without a break, so a "number" that doesn't
		// continue the sequence is a numbered list item the page opened a
		// paragraph with ("1. Der Literalsinn …"), not a paragraph of its own.
		if (item.k === 'p' && last > 0 && !(item.n > last && item.n - last <= 12)) {
			onDemote?.(item.n, item.html.slice(0, 60));
			out.push({ k: 'q', html: `${item.prefix}${item.html}`, notes: item.notes });
			continue;
		}
		if (item.k === 'p') last = item.n;
		if (item.k === 'q') {
			const previous = out[out.length - 1];
			if (previous?.k === 'p' && UNFINISHED.test(previous.html) && CONTINUES.test(item.html)) {
				// The tail's markers index into its own notes; shift them onto the end
				// of the paragraph's list as they move over.
				const offset = previous.notes.length;
				previous.html = `${previous.html} ${item.html.replace(/<sup data-note="(\d+)"><\/sup>/g, (_, i: string) => `<sup data-note="${Number(i) + offset}"></sup>`)}`;
				previous.notes.push(...item.notes);
				continue;
			}
			out.push(item);
			continue;
		}
		if (item.k !== 'p') {
			out.push(item);
			continue;
		}
		let current = { ...item };
		for (;;) {
			const next = current.n + 1;
			const at = new RegExp(`\\s${next}\\.?\\s`).exec(current.html);
			if (!at || at.index < 20) break;
			out.push({ ...current, html: current.html.slice(0, at.index).trim() });
			current = { ...current, n: next, prefix: at[0].trimStart(), html: current.html.slice(at.index + at[0].length).trim() };
			last = next;
		}
		out.push(current);
	}
	return out;
}
