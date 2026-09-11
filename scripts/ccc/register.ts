/**
 * The Catechism's thematic register — the thirty-odd pages at the back of the
 * printed book that send a topic to the paragraphs that treat it.
 *
 * Each language edition has its own, made for its own vocabulary, and only the
 * English one is published anywhere on the web: Catholic Doors Ministry has it
 * at catholicdoors.com/catechis/subject.htm, headwords marked up in brown, some
 * 1300 of them with 2800 lines between them.
 *
 * The German "Thematisches Register" and the Latin index are not online at all
 * — not on vatican.va, not at IntraText, not at the Innsbruck reading room.
 * They are in the printed book, and in the searchable PDF on the CD-ROM that
 * comes with the German hardcover. So a register can also be read from a plain
 * text file dropped at `scripts/ccc/register/<lang>.txt`, one entry per line,
 * a sub-entry indented by a tab or two spaces:
 *
 *     Abtreibung: 2270-2275
 *       Verurteilung in der frühen Kirche: 2271
 *       Exkommunikation als Strafe: 2272
 *     Abraham
 *       Berufung Abrahams: 59, 72, 762
 *       siehe auch: Glaube; Verheissung
 *
 * That is what a PDF text dump looks like once the page furniture is cut, so
 * the file needs no markup and no fixed spelling of the cross-reference words.
 */
import type { RegisterEntry, RegisterLine, RegisterRef } from '../../src/lib/faith/cccTypes';
import { CCC_LAST } from '../../src/lib/faith/cccTypes';

/** "see", in the languages a register might be written in. */
const SEE = /^(?:see also|see|s\.\s*a\.|siehe auch|siehe|vgl\.|cf\.|vide)\b[:\s]*/i;

/**
 * "2270-75" is 2270–2275 and "144-46" is 144–146: the printed registers
 * abbreviate the end of a range to the digits that change.
 */
function expand(from: number, rawTo: string): number {
	const to = Number(rawTo);
	if (to >= from) return to;
	const prefix = String(from).slice(0, String(from).length - rawTo.length);
	const joined = Number(`${prefix}${rawTo}`);
	return joined >= from ? joined : to;
}

const REFS = /(\d{1,4})\s*(?:[-–]\s*(\d{1,4}))?/g;

export function parseRefs(text: string): RegisterRef[] {
	const out: RegisterRef[] = [];
	REFS.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = REFS.exec(text))) {
		const from = Number(m[1]);
		if (from < 1 || from > CCC_LAST) continue;
		const to = m[2] ? expand(from, m[2]) : from;
		out.push({ from, to: Math.min(to, CCC_LAST) });
	}
	return out;
}

/** "call of Abraham: 59, 72, 762" · "see also: Prayer; Liturgy" · "Abraham". */
function line(raw: string): RegisterLine | null {
	const text = raw.replace(/\s+/g, ' ').trim();
	if (!text) return null;

	// The first colon separates the entry from its paragraphs; later ones belong
	// to a cross-reference's own path ("see God: names of God").
	const at = text.indexOf(':');
	const head = at < 0 ? text : text.slice(0, at).trim();
	const tail = at < 0 ? '' : text.slice(at + 1).trim();

	// A line that is nothing but a cross-reference ("see also: Prayer; Liturgy")
	// has no label of its own.
	if (SEE.test(head)) return { label: '', refs: [], see: splitSee(`${head.replace(SEE, '')} ${tail}`) };
	if (SEE.test(tail)) return { label: head, refs: [], see: splitSee(tail.replace(SEE, '')) };

	const refs = parseRefs(tail);
	if (!refs.length && at >= 0 && tail) return { label: text, refs: [] };
	return { label: head, refs };
}

const splitSee = (text: string) =>
	text
		.split(';')
		.map((s) => s.replace(/[.;]+$/, '').trim())
		.filter(Boolean);

/**
 * The English register as Catholic Doors publishes it: a headword is the text
 * inside `<font color="brown">`, everything after it until the next one is
 * printed under it.
 */
export function parseCatholicDoors(html: string): RegisterEntry[] {
	const HEAD = '\u0001';
	const body = html.slice(html.indexOf('SUBJECT INDEX'));
	const rows = body
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<font color="?brown"?>/gi, `\n${HEAD}`)
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&rsquo;/g, '\u2019')
		.split('\n');

	const out: RegisterEntry[] = [];
	for (const row of rows) {
		const headword = row.startsWith(HEAD);
		const parsed = line(row.replace(HEAD, ''));
		if (!parsed) continue;
		// Page furniture — "Continue to letter J.", the footer — sits before the
		// first headword and after the last, and names no paragraph.
		if (!headword && !out.length) continue;
		collect(out, parsed, headword);
	}
	return out.filter((entry) => entry.refs.length || entry.lines.length || entry.see);
}

/**
 * A long entry wraps across two rows in both sources — the printed column is
 * narrow, and the HTML keeps the break. A row that names no paragraph and
 * continues the sentence above belongs to the row above.
 */
function collect(out: RegisterEntry[], parsed: RegisterLine, headword: boolean): void {
	const previous = out[out.length - 1];
	const last: RegisterLine | undefined = previous?.lines[previous.lines.length - 1] ?? previous;
	const continues = !headword && !parsed.refs.length && !parsed.see && last && (/[,;]$/.test(last.see?.at(-1) ?? last.label) || /^[a-zä-ÿ(]/.test(parsed.label));
	if (continues && last) {
		if (last.see?.length) last.see[last.see.length - 1] = `${last.see[last.see.length - 1]} ${parsed.label}`.replace(/,\s+/, ', ');
		else last.label = `${last.label} ${parsed.label}`;
		return;
	}
	if (headword || !previous) out.push({ ...parsed, lines: [] });
	else previous.lines.push(parsed);
}

/** A register typed or dumped as indented text; see the note at the top. */
export function parseIndented(text: string): RegisterEntry[] {
	const out: RegisterEntry[] = [];
	for (const row of text.split('\n')) {
		if (!row.trim()) continue;
		const indented = /^(\t| {2,})/.test(row);
		const parsed = line(row);
		if (!parsed) continue;
		collect(out, parsed, !indented);
	}
	return out;
}
