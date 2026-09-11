/**
 * The Second Vatican Council and the Code of Canon Law — the two bodies of
 * text the Catechism cites most after Scripture.
 *
 * Both are numbered the same way in every language (article 11 of Lumen
 * gentium, canon 883), so a citation carries the number and nothing else, and
 * the reader shows it in whichever language they are reading — exactly as a
 * Catechism paragraph works.
 */

export type CouncilLang = 'de' | 'en' | 'la';

/** What kind of act a council document is; the reader prints it as a label. */
export type CouncilKind = 'constitution' | 'decree' | 'declaration';

export type CouncilNote = { k: number; html: string };

export type CouncilArticle = {
	n: number;
	html: string;
	/** A heading that stands above this article, where there is one. */
	heading?: string;
};

export type CouncilDocument = {
	abbr: string;
	/** "Lumen gentium" — the incipit everyone cites it by. */
	title: string;
	/** "Dogmatische Konstitution über die Kirche" — what it calls itself. */
	subtitle: string;
	kind: CouncilKind;
	/** Promulgation date, ISO. */
	date: string;
	articles: CouncilArticle[];
	notes: CouncilNote[];
};

/** One canon of the 1983 Code, with the book and title it sits under. */
export type Canon = {
	n: number;
	html: string;
	/** Where in the Code it stands: book, part, title, as the Code names them. */
	where: string[];
};

/** The abbreviations the Catechism cites the council's documents by. */
export const COUNCIL_ABBR = ['SC', 'IM', 'LG', 'OE', 'UR', 'CD', 'OT', 'GE', 'NA', 'PC', 'DV', 'AA', 'DH', 'AG', 'PO', 'GS'] as const;

export type CouncilAbbr = (typeof COUNCIL_ABBR)[number];

const ABBR = new Set<string>(COUNCIL_ABBR);
export const isCouncilAbbr = (value: string): value is CouncilAbbr => ABBR.has(value.toUpperCase());

/** Reader address of a council article: /glaube/konzil/lg/11, per language. */
export function councilPath(lang: CouncilLang, abbr: string, article?: number): string {
	const section = lang === 'en' ? 'faith/council' : lang === 'la' ? 'fides/concilium' : 'glaube/konzil';
	return `/${section}/${abbr.toLowerCase()}${article ? `/${article}` : ''}`;
}

/** Reader address of a canon: /glaube/kirchenrecht/883, per language. */
export function canonPath(lang: CouncilLang, canon?: number): string {
	const section = lang === 'en' ? 'faith/canon-law' : lang === 'la' ? 'fides/ius-canonicum' : 'glaube/kirchenrecht';
	return `/${section}${canon ? `/${canon}` : ''}`;
}
