/**
 * The sixteen documents of the Second Vatican Council, as vatican.va files
 * them — and, importantly, in German, English and Latin alike: the council is
 * the one body of text the Catechism leans on that is published in all three
 * of the languages this site reads.
 *
 * `articles` is how many the document has. It is not used to parse anything;
 * it is there so that a parse that comes out short or long says so instead of
 * quietly shipping half a constitution.
 */
import type { CouncilKind } from '../../src/lib/faith/councilTypes';

export type CouncilSource = {
	abbr: string;
	/** The path segment on vatican.va, without the language suffix. */
	slug: string;
	kind: CouncilKind;
	date: string;
	articles: number;
};

export const COUNCIL: CouncilSource[] = [
	{ abbr: 'SC', slug: 'vat-ii_const_19631204_sacrosanctum-concilium', kind: 'constitution', date: '1963-12-04', articles: 130 },
	{ abbr: 'IM', slug: 'vat-ii_decree_19631204_inter-mirifica', kind: 'decree', date: '1963-12-04', articles: 24 },
	{ abbr: 'LG', slug: 'vat-ii_const_19641121_lumen-gentium', kind: 'constitution', date: '1964-11-21', articles: 69 },
	{ abbr: 'OE', slug: 'vat-ii_decree_19641121_orientalium-ecclesiarum', kind: 'decree', date: '1964-11-21', articles: 30 },
	{ abbr: 'UR', slug: 'vat-ii_decree_19641121_unitatis-redintegratio', kind: 'decree', date: '1964-11-21', articles: 24 },
	{ abbr: 'CD', slug: 'vat-ii_decree_19651028_christus-dominus', kind: 'decree', date: '1965-10-28', articles: 44 },
	{ abbr: 'OT', slug: 'vat-ii_decree_19651028_optatam-totius', kind: 'decree', date: '1965-10-28', articles: 22 },
	{ abbr: 'GE', slug: 'vat-ii_decl_19651028_gravissimum-educationis', kind: 'declaration', date: '1965-10-28', articles: 12 },
	{ abbr: 'NA', slug: 'vat-ii_decl_19651028_nostra-aetate', kind: 'declaration', date: '1965-10-28', articles: 5 },
	{ abbr: 'PC', slug: 'vat-ii_decree_19651028_perfectae-caritatis', kind: 'decree', date: '1965-10-28', articles: 25 },
	{ abbr: 'DV', slug: 'vat-ii_const_19651118_dei-verbum', kind: 'constitution', date: '1965-11-18', articles: 26 },
	{ abbr: 'AA', slug: 'vat-ii_decree_19651118_apostolicam-actuositatem', kind: 'decree', date: '1965-11-18', articles: 33 },
	{ abbr: 'DH', slug: 'vat-ii_decl_19651207_dignitatis-humanae', kind: 'declaration', date: '1965-12-07', articles: 15 },
	{ abbr: 'AG', slug: 'vat-ii_decree_19651207_ad-gentes', kind: 'decree', date: '1965-12-07', articles: 42 },
	{ abbr: 'PO', slug: 'vat-ii_decree_19651207_presbyterorum-ordinis', kind: 'decree', date: '1965-12-07', articles: 22 },
	{ abbr: 'GS', slug: 'vat-ii_const_19651207_gaudium-et-spes', kind: 'constitution', date: '1965-12-07', articles: 93 }
];

/**
 * Articles vatican.va's own pages number wrongly or not at all. Each names the
 * opening words of the paragraph that begins the article, which is steadier
 * than a position: a re-flowed page moves paragraphs about, it does not
 * re-word them.
 */
export type Misnumbered = { lang: 'de' | 'en' | 'la'; abbr: string; article: number; opens: string; why: string };

export const MISNUMBERED: Misnumbered[] = [
	{ lang: 'en', abbr: 'SC', article: 87, opens: 'In order that the divine office may be better', why: 'printed "81." — a typo for 87' },
	{ lang: 'en', abbr: 'OT', article: 22, opens: 'The Fathers of this holy synod have pursued', why: 'the closing article carries no number' },
	{ lang: 'la', abbr: 'GE', article: 4, opens: 'In munere suo educationis explendo', why: 'the page skips from 3 to 5' }
];

const BASE = 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/';

/** vatican.va's language suffixes: German is `ge`, Latin `lt`. */
const SUFFIX = { de: 'ge', en: 'en', la: 'lt' } as const;

export const councilUrl = (source: CouncilSource, lang: keyof typeof SUFFIX) => `${BASE}${source.slug}_${SUFFIX[lang]}.html`;
