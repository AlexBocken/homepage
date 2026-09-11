/**
 * The Catechism's shape, shared by the importer, the server loader and the
 * reader. Paragraph numbers (1…2865) are the same in every edition, so they —
 * not any per-language slug — are what a citation, a section boundary and the
 * glossary all key on.
 */

export type CccLang = 'de' | 'en' | 'la';

/** Highest paragraph in the Catechism; the importer refuses a gap below it. */
export const CCC_LAST = 2865;

/** A citation inside a footnote, resolved as far as we can resolve it. */
export type CccRef =
	/** A Bible passage, in the canon slug the reader's Bible uses. */
	| { kind: 'bible'; text: string; slug: string; chapter: number; verse: number | null; to: number | null }
	/** Another paragraph of the Catechism. */
	| { kind: 'ccc'; text: string; n: number }
	/** Everything else — a council, a Father, the Code, a liturgical book. */
	| { kind: 'doc'; text: string };

/** A footnote of one section, numbered as its edition numbers it. */
export type CccNote = {
	k: number;
	html: string;
	refs: CccRef[];
};

export type CccBlock =
	/** A heading inside a section: the article title (1) or a subheading (2). */
	| { t: 'h'; level: number; text: string }
	/**
	 * A numbered paragraph. `brief` marks the KURZTEXTE / IN BRIEF summaries;
	 * `revised` is the date a paragraph was promulgated anew after 1997 — only
	 * 2267 so far, and the reader says so beside it.
	 */
	| { t: 'p'; n: number; html: string; brief?: true; revised?: string }
	/** An unnumbered block quotation continuing the paragraph above it. */
	| { t: 'q'; html: string };

/** One article (or chapter, or paragraphus) of the Catechism, in one language. */
export type CccSection = {
	id: string;
	title: string;
	breadcrumb: string[];
	first: number;
	last: number;
	blocks: CccBlock[];
	notes: CccNote[];
};

/** A node of the structure tree — language-independent but for its titles. */
export type CccNode = {
	id: string;
	level: number;
	/** Title per language; the importer fills what each edition provides. */
	title: Record<CccLang, string>;
	children: CccNode[];
	/** Paragraph range of the section this node owns, when it owns one. */
	range: [number, number] | null;
};

export type CccStructure = {
	tree: CccNode[];
	/** Paragraph number → section id. The map every deep link goes through. */
	sectionOf: Record<string, string>;
	/** Section ids in reading order, for prev/next. */
	order: string[];
	/** Section id → its paragraph range. */
	ranges: Record<string, [number, number]>;
};

/**
 * A section id spells out its own path — `p2s2c1a3` is part 2, section 2,
 * chapter 1, article 3 — so its ancestors need no lookup.
 */
const ID = /^(fidei-depositum|prologus|p\d+)(s\d+)?(c\d+)?(a\d+)?(p\d+)?$/;

export function cccAncestors(id: string): string[] {
	const m = ID.exec(id);
	if (!m) return [];
	const out: string[] = [];
	let path = '';
	for (const part of m.slice(1)) {
		if (!part) continue;
		path += part;
		out.push(path);
	}
	return out;
}

/** `1322`, `1322-1327` — what a citation and a URL may say. */
export function parseCccRange(input: string): { from: number; to: number } | null {
	const m = /^(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?$/.exec(input.trim());
	if (!m) return null;
	const from = Number(m[1]);
	const to = m[2] ? Number(m[2]) : from;
	if (from < 1 || to > CCC_LAST || to < from) return null;
	return { from, to };
}

/** How a citation is written per language: KKK 2095 · CCC 2095 · CEC 2095. */
export function cccLabel(lang: CccLang, from: number, to?: number): string {
	const abbr = lang === 'de' ? 'KKK' : lang === 'la' ? 'CEC' : 'CCC';
	return to && to !== from ? `${abbr} ${from}–${to}` : `${abbr} ${from}`;
}
