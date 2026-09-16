/**
 * The Catechism's other bodies of citation: the Second Vatican Council, the
 * Code of Canon Law, and the papal and curial documents.
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
import { MAGISTERIUM_ABBR } from '../magisterium/abbr';
import index from '../../src/lib/data/magisterium-index.json';
import type { CccLang } from '../../src/lib/faith/cccTypes';
import type { MagisteriumEntry } from '../../src/lib/faith/magisteriumTypes';

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

/**
 * The papal and curial documents, by the incipit every edition prints — "Litt.
 * enc. *Centesimus annus*, 24", "Enzyklika *Centesimus annus*, 24" — and by
 * the abbreviations the German and English editions prefer.
 *
 * Longest incipit first, so that `Mater et magistra` is not matched as `Mater`
 * by some future shorter neighbour.
 */
const ENTRIES = index as MagisteriumEntry[];
const BY_SLUG = new Map(ENTRIES.map((e) => [e.slug, e]));
const INCIPITS = [...ENTRIES].sort((a, b) => b.title.length - a.title.length);

const TITLES = INCIPITS.map((e) => e.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
/**
 * What announces a citation: the kind of act, as each edition abbreviates it.
 *
 * This matters more here than it did for the council. `Lumen gentium` is only
 * ever a document, but half of these incipits are ordinary Latin — `Dei
 * Filius` is the Son of God, `humanae vitae` is the genitive of human life,
 * `Mysterium fidei` is said at every Mass. So an incipit is read as a citation
 * only when a number follows it, or when the edition has just said what kind
 * of document is coming.
 */
const ANNOUNCED = String.raw`(?:Litt\.\s*[Ee]nc\.|Ep\.\s*enc\.|Adh\.\s*ap\.|Const\.\s*ap\.|Ep\.\s*ap\.|Litt\.\s*ap\.|Decl\.|Instr\.|Decr\.|Enzyklika|Erkl\.|Instr\.|Apostolisches Schreiben|encyclical|exhortation|declaration|instruction|constitution)\s*,?\s*`;
/** "Centesimus annus, 24" — an incipit with the article it cites. */
const MAGISTERIUM = new RegExp(String.raw`\b(${TITLES})\s*,?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`, 'gi');
/** "Decl. Inter insigniores" — announced, and cited whole. */
const MAGISTERIUM_WHOLE = new RegExp(ANNOUNCED + String.raw`(${TITLES})\b`, 'gi');
/** "CA 32", "FC 19-20". An abbreviation with no number is not a citation. */
const MAGISTERIUM_SHORT = new RegExp(String.raw`\b(${Object.keys(MAGISTERIUM_ABBR).join('|')})\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?`, 'g');

export type DocTally = { council: number; canons: number; magisterium: number; dropped: Map<string, number> };

export const newDocTally = (): DocTally => ({ council: 0, canons: 0, magisterium: 0, dropped: new Map() });

type Hit = { start: number; end: number; kind: 'council' | 'canon' | 'magisterium'; abbr?: string; slug?: string; from: number; to?: number };

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

	MAGISTERIUM.lastIndex = 0;
	for (let m = MAGISTERIUM.exec(text); m; m = MAGISTERIUM.exec(text)) {
		const entry = INCIPITS.find((e) => e.title.toLowerCase() === m![1].toLowerCase());
		if (entry) hits.push({ start: m.index, end: m.index + m[0].length, kind: 'magisterium', slug: entry.slug, from: Number(m[2]), to: m[3] ? Number(m[3]) : undefined });
	}
	MAGISTERIUM_WHOLE.lastIndex = 0;
	for (let m = MAGISTERIUM_WHOLE.exec(text); m; m = MAGISTERIUM_WHOLE.exec(text)) {
		const entry = INCIPITS.find((e) => e.title.toLowerCase() === m![1].toLowerCase());
		// Only the incipit is wrapped; the "Litt. enc." that announced it is the
		// edition's word, not part of the citation.
		if (entry) hits.push({ start: m.index + m[0].length - m[1].length, end: m.index + m[0].length, kind: 'magisterium', slug: entry.slug, from: 0 });
	}
	MAGISTERIUM_SHORT.lastIndex = 0;
	for (let m = MAGISTERIUM_SHORT.exec(text); m; m = MAGISTERIUM_SHORT.exec(text)) {
		hits.push({ start: m.index, end: m.index + m[0].length, kind: 'magisterium', slug: MAGISTERIUM_ABBR[m[1]], from: Number(m[2]), to: m[3] ? Number(m[3]) : undefined });
	}

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
		if (hit.kind === 'magisterium') {
			const entry = BY_SLUG.get(hit.slug!);
			// A citation past the end of the document is not a citation of it;
			// the same guard that keeps a stray "SC 296" out of the text.
			if (!entry || hit.from > entry.articles || (hit.to && hit.to > entry.articles)) {
				tally.dropped.set(hit.slug!, (tally.dropped.get(hit.slug!) ?? 0) + 1);
				return null;
			}
			tally.magisterium++;
			const where = hit.from ? `/${hit.from}${hit.to ? `-${hit.to}` : ''}` : '';
			return { className: 'dref', attributes: `data-magisterium="${hit.slug}${where}"` };
		}
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
