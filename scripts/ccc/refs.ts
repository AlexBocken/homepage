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
	qo: 'koh', ct: 'hld', prv: 'spr', sap: 'weish', tb: 'tob', dn: 'dan',
	'1reg': '1kön', '2reg': '2kön', '1par': '1chr', '2par': '2chr',
	'1mac': '1makk', '2mac': '2makk', esd: 'esra', lam: 'klgl',
	'1thes': '1thess', '2thes': '2thess', '1pt': '1petr', '2pt': '2petr',
	rom: 'röm', eccli: 'sir',
	// German, where the KKK's abbreviations differ from the canon table's
	jo: 'joel',
	// English. The edition numbers some books with Roman ordinals ("I Cor") and
	// its scan turned a few of those into a lower-case L ("l Pt"); `ordinal()`
	// below folds both into digits before the lookup.
	jn: 'joh', '1jn': '1joh', '2jn': '2joh', '3jn': '3joh',
	acts: 'apg', rev: 'offb', heb: 'hebr', jas: 'jak', jude: 'jud',
	sg: 'hld', song: 'hld', canticle: 'hld', wis: 'weish',
	isa: 'jes', pss: 'ps', zach: 'sach', soph: 'zef', mich: 'mi', 'joël': 'joel',
	ezek: 'ez', prov: 'spr', eccl: 'koh',
	'1sm': '1sam', '2sm': '2sam', '1kgs': '1kön', '2kgs': '2kön',
	'1macc': '1makk', '2macc': '2makk', '1pet': '1petr', '2pet': '2petr',
	'1pe': '1petr', '2pe': '2petr', '1th': '1thess', '2th': '2thess',
	'1job': 'ijob', amos: 'am', obad: 'obd', jon: 'jona', mic: 'mi',
	zeph: 'zef', zech: 'sach'
};

/**
 * Abbreviations one edition's scan corrupted. The German reading room prints
 * "Job 12,27" where the Catechism cites John — the `h` was read as a `b` — and
 * the German edition never writes "Job" for Job, which it calls Ijob. Only the
 * language that has the slip gets the correction.
 */
const PER_LANG: Record<CccLang, Record<string, { slug: string; print: string }>> = {
	de: { job: { slug: 'joh', print: 'Joh' } },
	en: {},
	la: {}
};

const ORDINALS: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', l: '1' };
const ordinal = (raw: string) => ORDINALS[raw] ?? raw;
const key = (ord: string, name: string) => `${ordinal(ord.trim())}${name}`.toLowerCase().replace(/[\s.]/g, '');

function bookSlug(k: string, lang: CccLang): { slug: string; print: string | null } | null {
	const corrected = PER_LANG[lang][k];
	if (corrected) return { slug: corrected.slug, print: corrected.print };
	const slug = canonSlug(k) ?? EDITION_ABBR[k] ?? null;
	return slug ? { slug, print: null } : null;
}

/**
 * A citation looks like `<book> <chapter><,|:><verse>[-<verse>]`, in every
 * language. Candidates are matched loosely and then thrown away if the book
 * token isn't a book — cheaper and far more robust than trying to write one
 * regex that knows all three editions' abbreviations.
 */
const CANDIDATE = /(?:\b([1-4]|IV|III|II|I|l)\s+)?([A-ZÀ-Ü][A-Za-zÀ-ÿ]{0,12}\.?)\s{0,2}(\d{1,3})\s*[,.:]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g;

/**
 * A citation list names its book once: "Apg 8,15-17; 19,5-6", "Joh 3,5-8;
 * 7,37-39". Each further chapter,verse that follows a citation directly
 * belongs to the same book.
 */
const CONTINUATION = /^\s*[;.]\s*(\d{1,3})\s*[,.:]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/;

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
/** One Scripture citation found in a run of text, with where it sits. */
export type BibleHit = {
	start: number;
	end: number;
	text: string;
	slug: string;
	/** How the book should be spelled where the edition's scan got it wrong. */
	print: string | null;
	chapter: number;
	verse: number;
	to: number | null;
};

/** Every Scripture citation in a run of plain text, in order. */
export function findBible(text: string, lang: CccLang): BibleHit[] {
	const hits: BibleHit[] = [];
	CANDIDATE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = CANDIDATE.exec(text))) {
		const [whole, ord = '', name, chapter, verse, to] = m;
		const k = key(ord, name);
		const book = bookSlug(k, lang);
		if (!book) {
			// Only count tokens that could plausibly be a book, so that
			// "Ed. Leon. 12, 130" style noise doesn't drown the report.
			if (/^[A-ZÀ-Ü][a-zà-ÿ]/.test(name)) unresolvedCounts.set(k, (unresolvedCounts.get(k) ?? 0) + 1);
			continue;
		}
		// A leading space belongs to the separator, not to the citation.
		const lead = whole.length - whole.trimStart().length;
		hits.push({
			start: m.index + lead,
			end: m.index + whole.length,
			text: whole.trim(),
			slug: book.slug,
			print: book.print && book.print !== name.replace(/\.$/, '') ? book.print : null,
			chapter: Number(chapter),
			verse: Number(verse),
			to: to ? Number(to) : null
		});

		let at = m.index + whole.length;
		let more: RegExpMatchArray | null;
		while ((more = CONTINUATION.exec(text.slice(at)))) {
			const lead2 = more[0].length - more[0].replace(/^\s*[;.]\s*/, '').length;
			hits.push({
				start: at + lead2,
				end: at + more[0].length,
				text: more[0].replace(/^\s*[;.]\s*/, ''),
				slug: book.slug,
				print: null,
				chapter: Number(more[1]),
				verse: Number(more[2]),
				to: more[3] ? Number(more[3]) : null
			});
			at += more[0].length;
		}
		CANDIDATE.lastIndex = at;
	}
	return hits;
}

/**
 * Every citation in one footnote. Scripture references come back resolved;
 * anything else that looks like a source is kept as a `doc` ref so the reader
 * can still show what the note cites.
 */
export function extractRefs(text: string, lang: CccLang): CccRef[] {
	const refs: CccRef[] = [];
	const seen = new Set<string>();
	for (const hit of findBible(text, lang)) {
		const id = `${hit.slug} ${hit.chapter},${hit.verse}-${hit.to ?? ''}`;
		if (seen.has(id)) continue;
		seen.add(id);
		refs.push({ kind: 'bible', text: hit.text, slug: hit.slug, chapter: hit.chapter, verse: hit.verse, to: hit.to });
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
