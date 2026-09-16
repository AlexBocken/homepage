/**
 * Citations inside a Catechism footnote.
 *
 * Every edition writes its footnotes the same way — a Scripture reference, or a
 * council/Father/Code citation — but each in its own abbreviations. We resolve
 * the Scripture ones to the reader's canon slugs so they can be peeked like any
 * other reference on the site, and leave the rest as text.
 *
 * All three editions are scans, and scans of small print full of numbers. They
 * read `1` as `l`, `l` as `I`, and eat the hyphen out of a verse range, so
 * `Joh 11,41-42` comes through as `Joh 11,4142`. Rather than guess, every
 * repair below is *checked*: a candidate is only accepted when the verse it
 * lands on is really in the Bible this language reads (`exists`). A repair that
 * cannot be verified is left as plain text, exactly as before, and reported.
 *
 * `unresolved()` reports the book-looking tokens that no table matched and
 * `repaired()` what was mended and how, so the tables and the rules below can
 * be grown from evidence rather than guesswork
 * (`pnpm ccc:import --report-refs`).
 */
import { canonSlug } from '../../src/lib/faith/bibleCanon';
import type { CccLang, CccRef } from '../../src/lib/faith/cccTypes';

/** Whether a verse is really in the text this language reads. */
export type Exists = (slug: string, chapter: number, verse: number) => boolean;

/**
 * The same question, but the Psalms are not asked it.
 *
 * All three editions cite the Hebrew numbering and every text on this site is
 * Vulgate-numbered, so from psalm 10 on the two disagree by one and a check
 * against our own Bible would throw away nearly every psalm the Catechism
 * cites. `linkify.ts` converts them instead, and links a psalm to the psalm.
 */
const verified = (exists: Exists): Exists => (slug, chapter, verse) =>
	slug === 'ps' ? chapter >= 1 && chapter <= 151 && verse >= 0 : exists(slug, chapter, verse);

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

/**
 * Abbreviations one edition means differently from the canon table, which has
 * to be asked *before* it rather than after.
 *
 * The English Catechism names the books as the RSV does, and the Douay names
 * Samuel "Kings" — so "1 Kings 8:10-61" resolved to 1 Samuel, whose eighth
 * chapter stops at verse 22, and the reader was sent from Solomon dedicating
 * the temple to Samuel warning Israel about kings. The edition settles it
 * itself: it writes "1 Sam" and "1 Kings" both, so they are two books.
 */
const PER_LANG_ABBR: Record<CccLang, Record<string, string>> = {
	de: {},
	en: { '1kings': '1kön', '2kings': '2kön', '1kgs': '1kön', '2kgs': '2kön' },
	la: {}
};

const ORDINALS: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', l: '1' };
const ordinal = (raw: string) => ORDINALS[raw] ?? raw;
const key = (ord: string, name: string) => `${ordinal(ord.trim())}${name}`.toLowerCase().replace(/[\s.]/g, '');

function bookSlug(ord: string, name: string, lang: CccLang): { slug: string; print: string | null } | null {
	// The correction belongs to the name alone: the German reading room prints
	// "3 Job 7" where the Catechism cites the third letter of John, and mending
	// the whole of "3 Job" to "Joh" would lose the letter and land in a gospel.
	const corrected = PER_LANG[lang][name.toLowerCase().replace(/[\s.]/g, '')];
	const k = key(ord, corrected ? corrected.print : name);
	const slug = PER_LANG_ABBR[lang][k] ?? canonSlug(k) ?? EDITION_ABBR[k] ?? null;
	if (!slug) return null;
	return { slug, print: corrected ? corrected.print : null };
}

/* ---------------- what a scan does to a citation, and how to undo it ---------------- */

/** How a citation had to be mended before it would resolve. */
export type RepairKind =
	/** "weish 2,24" — the edition's own lower case, which the table reads anyway. */
	| 'a book written in lower case'
	/** "KoI 1,27" — a capital I read for an l. */
	| 'a letter read for another in the name'
	/** "Lk 2l,24" — an l or an O read for a digit. */
	| 'a letter read for a digit'
	/** "Joh 11,4142" — the hyphen eaten out of a verse range. */
	| 'the hyphen eaten out of a range'
	/** "Eph 2,203" — a footnote's digit left stuck to the verse. */
	| 'a footnote digit stuck to the verse'
	/** "1 Joh 6,16-17" — a stray digit read as the book's ordinal. */
	| 'a stray digit read as an ordinal';

/** `l` and `I` are what these scans read a 1 as, and `O` a nought. */
const asDigits = (raw: string) => raw.replace(/[lI]/g, '1').replace(/O/g, '0');
/** The other way about: `KoI` for `Kol`, `HId` for `Hld`. */
const asLetters = (raw: string) => raw.replace(/I/g, 'l').replace(/0/g, 'o');

/**
 * The last verse of a chapter in the Bible this language reads, found by
 * asking; the answer is kept, because the same chapter is asked about often.
 */
const lastVerses = new Map<string, number>();
function lastVerse(exists: Exists, slug: string, chapter: number): number {
	const k = `${slug}/${chapter}`;
	const known = lastVerses.get(k);
	if (known !== undefined) return known;
	let last = 0;
	while (last < 200 && exists(slug, chapter, last + 1)) last++;
	lastVerses.set(k, last);
	return last;
}

/** Whether a book is one chapter long, as the shortest letters are. */
const oneChapter = (exists: Exists, slug: string) => lastVerse(exists, slug, 1) > 0 && lastVerse(exists, slug, 2) === 0;

/**
 * How far past the end of a chapter a verse may be and still be read as the
 * other versification rather than as a scan's damage. The Vulgate ends Malachi
 * 3 at verse 18 and the Einheitsübersetzung at 24; the Catechism's "Mal 3,19"
 * is that difference, not a lost hyphen, and mending it to "3,1-9" would be an
 * invention.
 */
const ANOTHER_COUNT = 8;

/**
 * Where in the Catechism the citation being read stands, for the list
 * `--list-refs` writes. The importer sets it before each fragment; it is a
 * label and nothing depends on it.
 */
let where = '';
let readingLang = '';
export const reading = (lang: CccLang, label: string) => {
	readingLang = lang;
	where = label;
};

/** One citation, as it was printed and as it was read. */
export type Citation = { lang: string; where: string; printed: string; resolved: string; status: string };

const rows = new Map<string, Citation>();

/**
 * Every citation the importer saw, in the order it saw them. A note is read
 * twice — once for its own list of references and once to be linked — so the
 * rows are kept by what they say rather than by how often they were said.
 */
export const citations = (): Citation[] => [...rows.values()];

const row = (c: Citation) => {
	const k = `${c.lang}|${c.where}|${c.printed}|${c.resolved}`;
	if (!rows.has(k)) rows.set(k, c);
};

const unresolvedCounts = new Map<string, number>();
/** Citations whose verse is only just past the end: another versification. */
const differentCounts = new Map<string, number>();
const repairCounts = new Map<RepairKind, { n: number; examples: string[] }>();
/** Citations two different repairs would both mend, differently. Left alone. */
const ambiguousCases = new Map<string, number>();

/** Book-looking tokens no table matched, most frequent first. */
export function unresolved(): [string, number][] {
	return [...unresolvedCounts.entries()].sort((a, b) => b[1] - a[1]);
}

/** What was mended, by kind, with a few of each to look at. */
export function repaired(): { kind: RepairKind; n: number; examples: string[] }[] {
	return [...repairCounts.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.n - a.n);
}

/** Citations whose verse our Bible simply numbers differently. */
export function differentlyCounted(): [string, number][] {
	return [...differentCounts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Citations left alone because two readings of them are equally good. */
export function ambiguous(): [string, number][] {
	return [...ambiguousCases.entries()].sort((a, b) => b[1] - a[1]);
}

const note = (kind: RepairKind, example: string) => {
	const seen = repairCounts.get(kind) ?? { n: 0, examples: [] };
	seen.n++;
	if (seen.examples.length < 12 && !seen.examples.includes(example)) seen.examples.push(example);
	repairCounts.set(kind, seen);
};

/**
 * A citation looks like `<book> <chapter>[<,|:><verse>[-<verse>]]`, in every
 * language. Candidates are matched loosely and then thrown away if the book
 * token isn't a book — cheaper and far more robust than trying to write one
 * regex that knows all three editions' abbreviations.
 *
 * The verse is optional because the editions cite whole chapters too — "Vgl.
 * Ez 36", "Joël 3-4" — and a chapter is an address like any other.
 *
 * A number may have been scanned with letters in it, but it must still hold a
 * digit somewhere: without that guard the Latin "Cf Io 6,51" reads as the book
 * "Cf" of chapter "I", which eats the `I` of `Io` and destroys the citation
 * that was really there.
 */
const CANDIDATE =
	/(?:(?<![\w])([1-4]|IV|III|II|I|l)\s{0,2})?(?<![A-Za-zÀ-ÿ])([A-Za-zÀ-ÿ]{2,13})\.?\s{0,2}(?=[lIO]{0,2}\d)([\dlIO]{1,3})(?:\s*[,.:]\s*(?=[lIO]{0,2}\d)([\dlIO]{1,3})(?:\s*[-–]\s*(\d{1,3}))?|\s*[-–]\s*(\d{1,3})(?![,.:\d]))?/g;

/**
 * What tells a whole chapter from a number standing after a word.
 *
 * "Vgl. Ez 36" is a citation; "so 3 Tage" is a sentence, and `so` is Zephaniah
 * in the Latin table. A chapter with no verse in it carries nothing to check
 * against the Bible, so it is only read as a citation where the edition has
 * just said one is coming — or where one is already running, and this is the
 * next item in the list.
 */
const ANNOUNCED = /(?:Vgl\.|Cfr?\.?|See|;)\s*$/;

/**
 * A citation list names its book once: "Apg 8,15-17; 19,5-6", "Joh 3,5-8;
 * 7,37-39". Each further chapter,verse that follows a citation directly
 * belongs to the same book.
 */
const CONTINUATION = /^\s*[;.]\s*(\d{1,3})\s*[,.:]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/;
/**
 * And a further *verse* of the same chapter, which the editions write with a
 * point: "Apg 14,15.17", "1 Kor 10,6.11". Nothing but a number stands there,
 * so it is only read as a verse when nothing wordlike follows it — otherwise
 * "…, 15. 17 Menschen" would be a citation of verse 17.
 */
const VERSE_MORE = /^\s*\.\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?![\s]*[A-Za-zÀ-ÿ])/;

/** One Scripture citation found in a run of text, with where it sits. */
export type BibleHit = {
	start: number;
	end: number;
	text: string;
	slug: string;
	/** How the book should be spelled where the edition's scan got it wrong. */
	print: string | null;
	/** The whole citation as it should have been printed, where it was mended. */
	printed: string | null;
	chapter: number;
	verse: number;
	to: number | null;
	/** A whole chapter, cited with no verse: there is none to show. */
	whole?: boolean;
};

/** What the book token came to, and what had to be done to it. */
type Book = { slug: string; print: string | null; repair: RepairKind | null };

/**
 * The book this token names. Tried as it stands first; then as the edition's
 * own lower case, which only counts for a token long enough not to be an
 * ordinary word ("am" is Amos and also German); then with the letters a scan
 * confuses put back.
 */
function resolveBook(ord: string, name: string, lang: CccLang): Book | null {
	const plain = bookSlug(ord, name, lang);
	if (plain) {
		const lower = !/^[A-ZÀ-Ü]/.test(name);
		// A short abbreviation in lower case is not a book, it is a word: "am",
		// "so", "na" and "ct" are all in the table above and all of them are
		// ordinary German or Latin. Only a token too long to be one is read.
		if (lower && name.length < 3) return null;
		return { ...plain, repair: lower ? 'a book written in lower case' : null };
	}
	const mended = bookSlug(ord, asLetters(name), lang);
	if (mended && asLetters(name) !== name) return { slug: mended.slug, print: asLetters(name), repair: 'a letter read for another in the name' };
	return null;
}

/** The numbers of a citation, once the repairs that verify have been made. */
type Numbers = { chapter: number; verse: number; to: number | null; repair: RepairKind | null } | null;

/**
 * Reads the chapter and verse, mending the scan where — and only where — the
 * mended reading lands on a verse that is really there.
 *
 * Two different repairs can both produce a real verse: "Dt 6,45" is either the
 * range 4-5 with its hyphen eaten or verse 4 with a footnote's 5 stuck to it.
 * Neither is chosen; the citation stays plain text and is reported, because a
 * coin toss that links to the wrong verse is worse than no link at all.
 */
function resolveNumbers(slug: string, rawChapter: string, rawVerse: string | undefined, rawTo: string | undefined, raw: Exists, text: string): Numbers {
	const exists = verified(raw);
	const letters = /[lIO]/.test(rawChapter) || /[lIO]/.test(rawVerse ?? '');
	const chapter = Number(asDigits(rawChapter));
	if (!chapter) return null;

	// A whole chapter: there is no verse to check, so the chapter is checked
	// instead — every chapter has a first verse. Except that a book one chapter
	// long has no chapters to cite: "3 Joh 7" is verse 7 of the only one there
	// is, and reading it as a chapter would send it to a gospel.
	if (rawVerse === undefined) {
		if (oneChapter(exists, slug)) return exists(slug, 1, chapter) ? { chapter: 1, verse: chapter, to: null, repair: letters ? 'a letter read for a digit' : null } : null;
		if (!exists(slug, chapter, 1)) return null;
		return { chapter, verse: 0, to: null, repair: letters ? 'a letter read for a digit' : null };
	}

	const verse = Number(asDigits(rawVerse));
	// Where a range runs past the end of the chapter the editions are counting
	// a versification that is not ours — the Vulgate ends Matthew 17 at 26 and
	// the Catechism cites 27. The verse it starts at is still the right verse,
	// so the citation stands and only the range is let go.
	const to = rawTo && exists(slug, chapter, Number(rawTo)) ? Number(rawTo) : null;
	if (!verse) return null;
	if (exists(slug, chapter, verse)) {
		return { chapter, verse, to, repair: letters ? 'a letter read for a digit' : null };
	}

	// The verse is not there. Before reading that as damage: the three editions
	// count several books by a versification that is not the Vulgate's, and a
	// verse a little past the end of a chapter is that difference rather than a
	// scan's. Those are collected for their own day and mended by nobody.
	const end = lastVerse(exists, slug, chapter);
	if (end && verse > end && verse <= end + ANOTHER_COUNT) {
		const what = `${text}  (${slug} ${chapter} ends at ${end} here)`;
		differentCounts.set(what, (differentCounts.get(what) ?? 0) + 1);
		row({ lang: readingLang, where, printed: text, resolved: `${slug} ${chapter},${verse}`, status: `our Bible ends ${slug} ${chapter} at ${end}` });
		return null;
	}
	if (rawTo) return null;
	const digits = asDigits(rawVerse);
	if (digits.length < 2) return null;

	let split: Numbers = null;
	for (let i = 1; i < digits.length; i++) {
		const from = Number(digits.slice(0, i));
		const until = Number(digits.slice(i));
		if (!from || until <= from) continue;
		if (!exists(slug, chapter, from) || !exists(slug, chapter, until)) continue;
		split = { chapter, verse: from, to: until, repair: 'the hyphen eaten out of a range' };
		break;
	}
	const shortened = Number(digits.slice(0, -1));
	const trimmed: Numbers = shortened && exists(slug, chapter, shortened) ? { chapter, verse: shortened, to: null, repair: 'a footnote digit stuck to the verse' } : null;

	if (split && trimmed) {
		const both = `${text}  →  ${chapter},${split.verse}-${split.to} or ${chapter},${trimmed.verse}`;
		ambiguousCases.set(both, (ambiguousCases.get(both) ?? 0) + 1);
		row({ lang: readingLang, where, printed: text, resolved: `${slug} ${chapter},${split.verse}-${split.to} or ${chapter},${trimmed.verse}`, status: 'two repairs would differ — left as printed' });
		return null;
	}
	return split ?? trimmed;
}

/** Every Scripture citation in a run of plain text, in order. */
export function findBible(text: string, lang: CccLang, raw: Exists): BibleHit[] {
	const exists = verified(raw);
	const hits: BibleHit[] = [];
	CANDIDATE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = CANDIDATE.exec(text))) {
		const [whole, ord = '', name, rawChapter, rawVerse, rawVerseTo, rawChapterTo] = m;
		/**
		 * A candidate that comes to nothing must not carry the scan past what
		 * stands inside it. "Vgl. 1 Kor 10,6" offers "Vgl. 1" first — a word and
		 * a number, which is a citation's shape — and skipping the whole of that
		 * would swallow the ordinal and leave "Kor 10,6", which is no book at
		 * all. So a miss steps forward by one character, not by a match.
		 */
		const rewind = () => {
			CANDIDATE.lastIndex = m!.index + 1;
		};

		let book = resolveBook(ord, name, lang);
		let repair = book?.repair ?? null;
		// "Vgl. 1 Joh 6,16-17" is John, with a footnote's 1 in front of it: the
		// ordinal makes a book that exists and a chapter that does not.
		const bare = ord ? resolveBook('', name, lang) : null;
		const failed = !book || !resolveNumbers(book.slug, rawChapter, rawVerse, rawVerseTo, raw, whole.trim());
		if (failed && bare && resolveNumbers(bare.slug, rawChapter, rawVerse, rawVerseTo, raw, whole.trim())) {
			book = bare;
			repair = 'a stray digit read as an ordinal';
		}

		if (!book) {
			// Only count tokens that could plausibly be a book, so that
			// "Ed. Leon. 12, 130" style noise doesn't drown the report.
			if (/^[A-ZÀ-Ü][a-zà-ÿ]/.test(name)) {
				const k = key(ord, name);
				unresolvedCounts.set(k, (unresolvedCounts.get(k) ?? 0) + 1);
			}
			rewind();
			continue;
		}
		const numbers = resolveNumbers(book.slug, rawChapter, rawVerse, rawVerseTo, raw, whole.trim());
		// A leading space belongs to the separator, not to the citation.
		const lead = whole.length - whole.trimStart().length;
		const announced = /^[A-ZÀ-Ü]/.test(name) && ANNOUNCED.test(text.slice(Math.max(0, m.index - 16), m.index + lead));
		if (numbers && !numbers.verse && !announced) {
			rewind();
			continue;
		}
		// "Vgl. Ex 20,39; 36,20-21" — the first citation is beyond the end of
		// Exodus 20 and cannot be mended, but the book is known and the list
		// goes on, so the run is walked anyway and only its head is dropped.
		const opening = numbers?.chapter ?? Number(asDigits(rawChapter));
		if (!numbers && !opening) {
			rewind();
			continue;
		}
		if (numbers?.repair) repair = numbers.repair;
		const printedName = book.print ?? (repair === 'a book written in lower case' ? name[0].toUpperCase() + name.slice(1) : null);
		// The ordinal is part of the book's name on the page — a citation re-set
		// as "Kor 8,10-13" would have lost the 1 of 1 Corinthians.
		const shown = `${ord && repair !== 'a stray digit read as an ordinal' ? `${ordinal(ord.trim())} ` : ''}${printedName ?? name}`;
		const spelled = numbers
			? numbers.verse
				? `${shown} ${numbers.chapter},${numbers.verse}${numbers.to ? `-${numbers.to}` : ''}`
				: `${shown} ${numbers.chapter}`
			: '';
		if (numbers && repair) note(repair, `${lang}  ${whole.trim()}  →  ${spelled}`);
		if (numbers) {
			const target = numbers.verse ? `${book.slug} ${numbers.chapter},${numbers.verse}${numbers.to ? `-${numbers.to}` : ''}` : `${book.slug} ${numbers.chapter}`;
			row({ lang: readingLang, where, printed: whole.trim(), resolved: target, status: repair ? `mended: ${repair}` : numbers.verse ? 'linked' : 'linked as a whole chapter' });
		}

		if (numbers) hits.push({
			start: m.index + lead,
			end: m.index + whole.length,
			text: whole.trim(),
			slug: book.slug,
			print: printedName && printedName !== name.replace(/\.$/, '') ? printedName : null,
			// Only a citation whose numbers were mended is re-set on the page; a
			// reader who sees "Lk 2l,24" underlined has been told the scan is
			// right and we are wrong.
			printed: numbers.repair && numbers.verse ? spelled : null,
			chapter: numbers.chapter,
			verse: numbers.verse,
			to: numbers.to,
			...(numbers.verse ? {} : { whole: true })
		});

		// "Joël 3-4" — a range of whole chapters. Only the first is addressable.
		if (numbers && !numbers.verse && rawChapterTo) {
			CANDIDATE.lastIndex = m.index + whole.length;
			continue;
		}

		let at = m.index + whole.length;
		let chapter = opening;
		// A run goes on until nothing more follows it. Each further piece is read
		// as a chapter of the same book, or as a verse of the same chapter, and
		// the run only ends when neither fits — never on the first piece that
		// does not, which used to throw away everything behind it.
		for (;;) {
			const rest = text.slice(at);
			const more = CONTINUATION.exec(rest);
			if (more) {
				const lead2 = more[0].length - more[0].replace(/^\s*[;.]\s*/, '').length;
				const [, c, v, v2] = more;
				if (exists(book.slug, Number(c), Number(v))) {
					chapter = Number(c);
					row({ lang: readingLang, where, printed: more[0].replace(/^\s*[;.]\s*/, ''), resolved: `${book.slug} ${c},${v}${v2 ? `-${v2}` : ''}`, status: 'linked, continuing the run' });
					hits.push({
						start: at + lead2,
						end: at + more[0].length,
						text: more[0].replace(/^\s*[;.]\s*/, ''),
						slug: book.slug,
						print: null,
						printed: null,
						chapter,
						verse: Number(v),
						to: v2 ? Number(v2) : null
					});
				}
				at += more[0].length;
				continue;
			}
			const another = VERSE_MORE.exec(rest);
			if (another && exists(book.slug, chapter, Number(another[1]))) {
				const lead2 = another[0].length - another[0].replace(/^\s*\.\s*/, '').length;
				row({ lang: readingLang, where, printed: another[0].replace(/^\s*\.\s*/, ''), resolved: `${book.slug} ${chapter},${another[1]}${another[2] ? `-${another[2]}` : ''}`, status: 'linked, a further verse of the same chapter' });
				hits.push({
					start: at + lead2,
					end: at + another[0].length,
					text: another[0].replace(/^\s*\.\s*/, ''),
					slug: book.slug,
					print: null,
					printed: null,
					chapter,
					verse: Number(another[1]),
					to: another[2] ? Number(another[2]) : null
				});
				at += another[0].length;
				continue;
			}
			break;
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
export function extractRefs(text: string, lang: CccLang, exists: Exists): CccRef[] {
	const refs: CccRef[] = [];
	const seen = new Set<string>();
	for (const hit of findBible(text, lang, exists)) {
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
