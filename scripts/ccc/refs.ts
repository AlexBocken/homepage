/**
 * Citations inside a Catechism footnote.
 *
 * Every edition writes its footnotes the same way — a Scripture reference, or a
 * council/Father/Code citation — but each in its own abbreviations. We resolve
 * the Scripture ones to the reader's canon slugs so they can be peeked like any
 * other reference on the site, and leave the rest as text.
 *
 * `unresolved()` reports the book-looking tokens that no table matched, so the
 * abbreviation lists below can be grown from evidence rather than guesswork
 * (`pnpm ccc:import --report-refs`).
 */
import { canonSlug } from '../../src/lib/faith/bibleCanon';
import type { CccLang, CccRef } from '../../src/lib/faith/cccTypes';

/**
 * Abbreviations the three editions use that the site's canon table doesn't
 * already know. Keys are lower-cased and stripped of spaces and dots.
 */
const EDITION_ABBR: Record<string, string> = {
	// Latin (editio typica)
	io: 'joh', ioh: 'joh', '1io': '1joh', '2io': '2joh', '3io': '3joh',
	mc: 'mk', lc: 'lk', act: 'apg', iac: 'jak', iud: 'jud', apc: 'offb',
	idc: 'ri', ios: 'jos', idt: 'jdt', iob: 'ijob', ioel: 'joel', ion: 'jona',
	ier: 'jer', za: 'sach', so: 'zef', abd: 'obd', na: 'nah', ag: 'hag',
	qo: 'koh', ct: 'hld', prv: 'spr', sap: 'weish', sir: 'sir', tb: 'tob',
	'1reg': '1kön', '2reg': '2kön', '1sam': '1sam', '2sam': '2sam',
	'1par': '1chr', '2par': '2chr', '1mac': '1makk', '2mac': '2makk',
	esd: 'esra', neh: 'neh', lam: 'klgl', bar: 'bar', dn: 'dan',
	'1thes': '1thess', '2thes': '2thess', phlm: 'phlm', hebr: 'hebr',
	'1pt': '1petr', '2pt': '2petr', rom: 'röm', eccli: 'sir',
	// German (Einheitsübersetzung abbreviations, as the KKK prints them)
	apg: 'apg', offb: 'offb', hebr_de: 'hebr', jo: 'joel', koh: 'koh',
	hld: 'hld', spr: 'spr', weish: 'weish', klgl: 'klgl', ijob: 'ijob',
	// English (as the Vatican's English edition prints them). It numbers some
	// books with Roman ordinals ("I Cor") and its scan turned a few of those
	// into a lower-case L ("l Pt"); `ordinal()` below folds both into digits.
	isa: 'jes', pss: 'ps', zach: 'sach', soph: 'zef', mich: 'mi', 'joël': 'joel',
	'1job': 'ijob', '1pe': '1petr', '2pe': '2petr', canticle: 'hld',
	'1th': '1thess', '2th': '2thess',
	jn: 'joh', '1jn': '1joh', '2jn': '2joh', '3jn': '3joh', mk: 'mk', lk: 'lk',
	acts: 'apg', rev: 'offb', heb: 'hebr', jas: 'jak', jude: 'jud',
	sg: 'hld', song: 'hld', sir_en: 'sir', wis: 'weish', tob: 'tob',
	jdt: 'jdt', bar_en: 'bar', lam: 'klgl', ezek: 'ez', dan: 'dan',
	'1cor': '1kor', '2cor': '2kor', '1thess': '1thess', '2thess': '2thess',
	'1tim': '1tim', '2tim': '2tim', '1pet': '1petr', '2pet': '2petr',
	'1sm': '1sam', '2sm': '2sam', '1kgs': '1kön', '2kgs': '2kön',
	'1chr': '1chr', '2chr': '2chr', '1macc': '1makk', '2macc': '2makk',
	ps: 'ps', prov: 'spr', eccl: 'koh', is: 'jes', jer: 'jer', hos: 'hos',
	joel: 'joel', amos: 'am', obad: 'obd', jon: 'jona', mic: 'mi',
	nah: 'nah', hab: 'hab', zeph: 'zef', hag: 'hag', zech: 'sach', mal: 'mal'
};

const ORDINALS: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', l: '1' };
const ordinal = (raw: string) => ORDINALS[raw] ?? raw;
const key = (ord: string, name: string) => `${ordinal(ord.trim())}${name}`.toLowerCase().replace(/[\s.]/g, '');

function bookSlug(k: string): string | null {
	return canonSlug(k) ?? EDITION_ABBR[k] ?? null;
}

/**
 * A citation looks like `<book> <chapter><,|:><verse>[-<verse>]`, in every
 * language. Candidates are matched loosely and then thrown away if the book
 * token isn't a book — cheaper and far more robust than trying to write one
 * regex that knows all three editions' abbreviations.
 */
const CANDIDATE = /(?:\b([1-4]|IV|III|II|I|l)\s+)?([A-ZÀ-Ü][A-Za-zÀ-ÿ]{0,12}\.?)\s+(\d{1,3})\s*[,:]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

const unresolvedCounts = new Map<string, number>();

/** Book-looking tokens no table matched, most frequent first. */
export function unresolved(): [string, number][] {
	return [...unresolvedCounts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Every citation in one footnote. Scripture references come back resolved;
 * anything else that looks like a source is kept as a `doc` ref so the reader
 * can still show what the note cites.
 */
export function extractRefs(text: string, lang: CccLang): CccRef[] {
	const refs: CccRef[] = [];
	const seen = new Set<string>();
	CANDIDATE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = CANDIDATE.exec(text))) {
		const [whole, ord = '', name, chapter, verse, to] = m;
		const k = key(ord, name);
		const slug = bookSlug(k);
		if (!slug) {
			// Only count tokens that could plausibly be a book, so that
			// "Ed. Leon. 12, 130" style noise doesn't drown the report.
			if (/^[A-ZÀ-Ü][a-zà-ÿ]/.test(name)) unresolvedCounts.set(k, (unresolvedCounts.get(k) ?? 0) + 1);
			continue;
		}
		const id = `${slug} ${chapter},${verse}-${to ?? ''}`;
		if (seen.has(id)) continue;
		seen.add(id);
		refs.push({
			kind: 'bible',
			text: whole.trim(),
			slug,
			chapter: Number(chapter),
			verse: Number(verse),
			to: to ? Number(to) : null
		});
	}
	// A footnote that cites the Catechism itself ("Vgl. Nr. 1234", "cf. 1234").
	const self = lang === 'de' ? /\bNr\.?\s*(\d{1,4})\b/g : /\b(?:cf\.|Cf)\s*(?:n\.|no\.)\s*(\d{1,4})\b/g;
	let s: RegExpExecArray | null;
	while ((s = self.exec(text))) {
		const n = Number(s[1]);
		if (n >= 1 && n <= 2865) refs.push({ kind: 'ccc', text: s[0], n });
	}
	if (refs.length === 0 && text.trim()) refs.push({ kind: 'doc', text: text.trim() });
	return refs;
}
