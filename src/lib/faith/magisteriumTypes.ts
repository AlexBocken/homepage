/**
 * The papal and curial documents the Catechism cites — encyclicals, apostolic
 * exhortations and constitutions, apostolic letters, and the declarations and
 * instructions of the Congregation for the Doctrine of the Faith — together
 * with the two dogmatic constitutions of the First Vatican Council.
 *
 * Structurally these are the same thing as a council document: an incipit,
 * numbered articles, footnotes. So they reuse `CouncilArticle` and
 * `CouncilNote` rather than restating them, and the reader shows an article
 * the way it shows Lumen gentium 11.
 *
 * What is new here is that the corpus is **ragged**. The council is published
 * in German, English and Latin alike; this is not. Leo XIII and Pius XI have
 * no German on vatican.va at all, `Divino afflante Spiritu` has only Latin,
 * and `Catechesi tradendae` — the fourth most cited document in the whole
 * apparatus — has everything but Latin. So every document carries the
 * languages it actually exists in, and the reader says which one it is
 * showing instead of quietly serving a language nobody asked for.
 */
import type { CouncilArticle, CouncilNote } from './councilTypes';

export type MagisteriumLang = 'de' | 'en' | 'la';

/** What kind of act it is; the reader prints it as a label. */
export type MagisteriumKind =
	| 'encyclical'
	| 'exhortation'
	| 'constitution'
	| 'letter'
	| 'declaration'
	| 'instruction';

/**
 * Who issued it. Not a free string: the reader prints each of these in three
 * languages, so a new one has to be given a name before it can be used.
 */
export type MagisteriumAuthor =
	| 'leo-xiii'
	| 'pius-xi'
	| 'pius-xii'
	| 'john-xxiii'
	| 'paul-vi'
	| 'john-paul-ii'
	| 'cdf'
	| 'vatican-i';

export type MagisteriumDocument = {
	/** "centesimus-annus" — the incipit, as an address. */
	slug: string;
	/** "Centesimus annus" — the incipit everyone cites it by, always Latin. */
	title: string;
	/** "Über die Weitergabe des Lebens" — what this edition calls it. */
	subtitle: string;
	kind: MagisteriumKind;
	author: MagisteriumAuthor;
	/** Promulgation date, ISO. */
	date: string;
	/**
	 * Whether this edition prints article numbers. The older Latin texts are
	 * the AAS as it was set, which numbered nothing: they are read as
	 * paragraphs, and the reader prints no numbers in the margin, because a
	 * number the edition never printed would be read as the Church's.
	 */
	numbered: boolean;
	articles: CouncilArticle[];
	notes: CouncilNote[];
};

/** One row of the index the reader and the linkifier share. */
export type MagisteriumEntry = {
	slug: string;
	title: string;
	kind: MagisteriumKind;
	author: MagisteriumAuthor;
	date: string;
	/** The languages vatican.va really publishes — not the ones it 200s for. */
	langs: MagisteriumLang[];
	/**
	 * Those of them that print article numbers, and so can answer a citation.
	 * An edition outside this list is readable and not citable.
	 */
	numbered: MagisteriumLang[];
	/** How many articles it has, for refusing a citation past the end. */
	articles: number;
};

/**
 * Reader address of an article: /glaube/lehrschreiben/centesimus-annus/24.
 *
 * German has no word that covers an encyclical, a constitution and a CDF
 * instruction at once except "Lehrschreiben"; English and Latin share
 * "magisterium".
 */
export function magisteriumPath(lang: MagisteriumLang, slug: string, article?: number): string {
	const section = lang === 'en' ? 'faith/magisterium' : lang === 'la' ? 'fides/magisterium' : 'glaube/lehrschreiben';
	return `/${section}/${slug}${article ? `/${article}` : ''}`;
}
