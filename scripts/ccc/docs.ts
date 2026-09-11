/**
 * The Catechism's other two bodies of citation: the Second Vatican Council and
 * the Code of Canon Law.
 *
 * Each edition cites them in its own way. German and English use the council's
 * abbreviations — "Vgl. LG 11", "Cf. SC 122-127" — and write the Code as
 * "CIC, can. 1055 § 1". The Latin never abbreviates: it prints the document's
 * name, "Concilium Vaticanum II, Const. dogm. Lumen gentium, 11", and says
 * "CIC canon 919". That difference matters more than it looks: in the Latin
 * apparatus "SC" is Sources Chrétiennes, not Sacrosanctum concilium, so an
 * abbreviation is only read as the council where the edition uses it that way.
 *
 * A citation is linked only if the article or canon is really there — the
 * council's longest document has 130 articles and the Code stops at 1752 —
 * which is also what keeps a stray "SC 296" out of the text.
 */
import { flatten, wrap } from './linkify';
import { COUNCIL } from '../council/documents';
import { LAST_CANON } from '../council/cic';
import type { CccLang } from '../../src/lib/faith/cccTypes';

/** How many articles each document has, to refuse a citation past the end. */
const ARTICLES = new Map(COUNCIL.map((d) => [d.abbr, d.articles]));

/** The incipit each document is known by, for the Latin's spelled-out form. */
const NAMES: [string, string][] = [
	['Sacrosanctum concilium', 'SC'],
	['Inter mirifica', 'IM'],
	['Lumen gentium', 'LG'],
	['Orientalium ecclesiarum', 'OE'],
	['Unitatis redintegratio', 'UR'],
	['Christus Dominus', 'CD'],
	['Optatam totius', 'OT'],
	['Gravissimum educationis', 'GE'],
	['Nostra aetate', 'NA'],
	['Perfectae caritatis', 'PC'],
	['Dei Verbum', 'DV'],
	['Apostolicam actuositatem', 'AA'],
	['Dignitatis humanae', 'DH'],
	['Ad gentes', 'AG'],
	['Presbyterorum ordinis', 'PO'],
	['Gaudium et spes', 'GS']
];

/** "LG 11", "SC 122-127" — the German and English form. */
const ABBREVIATED = new RegExp(String.raw`\b(${COUNCIL.map((d) => d.abbr).join('|')})\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`, 'g');
/** "Lumen gentium, 11" — the Latin form, and the odd German one. */
const SPELLED = new RegExp(String.raw`\b(${NAMES.map(([name]) => name).join('|')})\s*,?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`, 'gi');
/** "CIC, can. 1055", "CIC canones 916-917". The eastern Code is not here. */
const CANON = /\bCIC,?\s*(?:cann?\.|canones|canon)?\s*(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?/g;

export type DocTally = { council: number; canons: number; dropped: Map<string, number> };

export const newDocTally = (): DocTally => ({ council: 0, canons: 0, dropped: new Map() });

type Hit = { start: number; end: number; kind: 'council' | 'canon'; abbr?: string; from: number; to?: number };

/** Every council or canon citation in a fragment of flattened text. */
function find(text: string, lang: CccLang): Hit[] {
	const hits: Hit[] = [];
	const push = (m: RegExpExecArray, kind: Hit['kind'], abbr?: string) => {
		hits.push({ start: m.index, end: m.index + m[0].length, kind, abbr, from: Number(m[kind === 'council' ? 2 : 1]), to: m[kind === 'council' ? 3 : 2] ? Number(m[kind === 'council' ? 3 : 2]) : undefined });
	};

	// Only where the edition abbreviates. The Latin's "SC 296" is a volume of
	// Sources Chrétiennes and has nothing to do with the liturgy constitution.
	if (lang !== 'la') {
		ABBREVIATED.lastIndex = 0;
		for (let m = ABBREVIATED.exec(text); m; m = ABBREVIATED.exec(text)) push(m, 'council', m[1]);
	}
	SPELLED.lastIndex = 0;
	for (let m = SPELLED.exec(text); m; m = SPELLED.exec(text)) {
		const abbr = NAMES.find(([name]) => name.toLowerCase() === m![1].toLowerCase())?.[1];
		if (abbr) push(m, 'council', abbr);
	}
	CANON.lastIndex = 0;
	for (let m = CANON.exec(text); m; m = CANON.exec(text)) push(m, 'canon');

	// The spelled-out and abbreviated forms never overlap in one edition, but a
	// citation that did would be wrapped twice; first found wins.
	hits.sort((a, b) => a.start - b.start);
	return hits.filter((hit, i) => i === 0 || hit.start >= hits[i - 1].end);
}

/**
 * Wraps every council and canon citation in an anchor the reader can peek,
 * leaving the printed form exactly as the edition set it.
 */
export function linkifyDocs(html: string, lang: CccLang, tally: DocTally): string {
	if (!html) return html;
	const { text, at } = flatten(html);
	return wrap(html, at, find(text, lang), (hit) => {
		if (hit.kind === 'canon') {
			if (hit.from < 1 || hit.from > LAST_CANON || (hit.to && hit.to > LAST_CANON)) {
				tally.dropped.set('CIC', (tally.dropped.get('CIC') ?? 0) + 1);
				return null;
			}
			tally.canons++;
			return { className: 'dref', attributes: `data-canon="${hit.from}${hit.to ? `-${hit.to}` : ''}"` };
		}
		const last = ARTICLES.get(hit.abbr!) ?? 0;
		if (hit.from < 1 || hit.from > last || (hit.to && hit.to > last)) {
			tally.dropped.set(hit.abbr!, (tally.dropped.get(hit.abbr!) ?? 0) + 1);
			return null;
		}
		tally.council++;
		return { className: 'dref', attributes: `data-council="${hit.abbr!.toLowerCase()}/${hit.from}${hit.to ? `-${hit.to}` : ''}"` };
	});
}
