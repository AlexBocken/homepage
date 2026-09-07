/**
 * The Catholic canon in the order of the Vulgate, keyed by the reader's book
 * slug (the Allioli abbreviation, lower-cased, as `allioli -l` prints it).
 * Names in the three UI languages, plus the abbreviations the two TSV files
 * use so a book can be looked up in either text.
 */
export type CanonEntry = {
	order: number;
	testament: 'ot' | 'nt';
	de: string;
	en: string;
	la: string;
	/** Abbreviation in static/allioli.tsv (Protestant numbering, German). */
	tsv: string | null;
	/** Abbreviation in static/drb.tsv. */
	drb: string | null;
};

const ot = (de: string, en: string, la: string, tsv: string | null, drb: string | null): Omit<CanonEntry, 'order' | 'testament'> & { testament: 'ot' } => ({ testament: 'ot', de, en, la, tsv, drb });
const nt = (de: string, en: string, la: string, tsv: string | null, drb: string | null): Omit<CanonEntry, 'order' | 'testament'> & { testament: 'nt' } => ({ testament: 'nt', de, en, la, tsv, drb });

const LIST: [string, Omit<CanonEntry, 'order'>][] = [
	['gen', ot('Genesis', 'Genesis', 'Genesis', '1Mo', 'Gn')],
	['ex', ot('Exodus', 'Exodus', 'Exodus', '2Mo', 'Ex')],
	['lev', ot('Levitikus', 'Leviticus', 'Leviticus', '3Mo', 'Lv')],
	['num', ot('Numeri', 'Numbers', 'Numeri', '4Mo', 'Nm')],
	['dtn', ot('Deuteronomium', 'Deuteronomy', 'Deuteronomium', '5Mo', 'Dt')],
	['jos', ot('Josua', 'Josue', 'Iosue', 'Jos', 'Jos')],
	['ri', ot('Richter', 'Judges', 'Iudices', 'Ri', 'Jgs')],
	['rut', ot('Rut', 'Ruth', 'Ruth', 'Rt', 'Ru')],
	['1sam', ot('1 Samuel', '1 Kings', '1 Samuelis', '1Sam', '1Kgs')],
	['2sam', ot('2 Samuel', '2 Kings', '2 Samuelis', '2Sam', '2Kgs')],
	['1kön', ot('1 Könige', '3 Kings', '1 Regum', '1Kö', '3Kgs')],
	['2kön', ot('2 Könige', '4 Kings', '2 Regum', '2Kö', '4Kgs')],
	['1chr', ot('1 Chronik', '1 Paralipomenon', '1 Paralipomenon', '1Chr', '1Par')],
	['2chr', ot('2 Chronik', '2 Paralipomenon', '2 Paralipomenon', '2Chr', '2Par')],
	['esra', ot('Esra', '1 Esdras', 'Esdrae', 'Esr', '1Esd')],
	['neh', ot('Nehemia', '2 Esdras', 'Nehemiae', 'Neh', '2Esd')],
	['tob', ot('Tobit', 'Tobias', 'Tobiae', null, 'Tb')],
	['jdt', ot('Judit', 'Judith', 'Iudith', null, 'Jdt')],
	['est', ot('Ester', 'Esther', 'Esther', 'Est', 'Est')],
	['1makk', ot('1 Makkabäer', '1 Machabees', '1 Machabaeorum', null, '1Mac')],
	['2makk', ot('2 Makkabäer', '2 Machabees', '2 Machabaeorum', null, '2Mac')],
	['ijob', ot('Ijob', 'Job', 'Iob', 'Hi', 'Jb')],
	['ps', ot('Psalmen', 'Psalms', 'Psalmi', 'Ps', 'Ps')],
	['spr', ot('Sprichwörter', 'Proverbs', 'Proverbia', 'Spr', 'Prv')],
	['koh', ot('Kohelet', 'Ecclesiastes', 'Ecclesiastes', 'Pred', 'Eccles')],
	['hld', ot('Hohelied', 'Canticle of Canticles', 'Canticum Canticorum', 'Hl', 'CCan')],
	['weish', ot('Weisheit', 'Wisdom', 'Sapientia', null, 'Wis')],
	['sir', ot('Sirach', 'Ecclesiasticus', 'Ecclesiasticus', null, 'Ecclus')],
	['jes', ot('Jesaja', 'Isaias', 'Isaias', 'Jes', 'Is')],
	['jer', ot('Jeremia', 'Jeremias', 'Ieremias', 'Jer', 'Jer')],
	['klgl', ot('Klagelieder', 'Lamentations', 'Lamentationes', 'Kla', 'Lam')],
	['bar', ot('Baruch', 'Baruch', 'Baruch', null, 'Bar')],
	['ez', ot('Ezechiel', 'Ezekiel', 'Ezechiel', 'Hes', 'Ez')],
	['dan', ot('Daniel', 'Daniel', 'Daniel', 'Dan', 'Dn')],
	['hos', ot('Hosea', 'Osee', 'Osee', 'Hos', 'Os')],
	['joel', ot('Joel', 'Joel', 'Ioel', 'Joe', 'Jl')],
	['am', ot('Amos', 'Amos', 'Amos', 'Am', 'Am')],
	['obd', ot('Obadja', 'Abdias', 'Abdias', 'Ob', 'Ab')],
	['jona', ot('Jona', 'Jonas', 'Ionas', 'Jon', 'Jon')],
	['mi', ot('Micha', 'Micheas', 'Michaeas', 'Mi', 'Mi')],
	['nah', ot('Nahum', 'Nahum', 'Nahum', 'Nah', 'Na')],
	['hab', ot('Habakuk', 'Habacuc', 'Habacuc', 'Hab', 'Hb')],
	['zef', ot('Zefanja', 'Sophonias', 'Sophonias', 'Zeph', 'Sph')],
	['hag', ot('Haggai', 'Aggeus', 'Aggaeus', 'Hagg', 'Ag')],
	['sach', ot('Sacharja', 'Zacharias', 'Zacharias', 'Sach', 'Zac')],
	['mal', ot('Maleachi', 'Malachias', 'Malachias', 'Mal', 'Mal')],
	['mt', nt('Matthäus', 'Matthew', 'Matthaeus', 'Mt', 'Mt')],
	['mk', nt('Markus', 'Mark', 'Marcus', 'Mk', 'Mk')],
	['lk', nt('Lukas', 'Luke', 'Lucas', 'Lk', 'Lk')],
	['joh', nt('Johannes', 'John', 'Ioannes', 'Joh', 'Jn')],
	['apg', nt('Apostelgeschichte', 'Acts', 'Actus Apostolorum', 'Apg', 'Acts')],
	['röm', nt('Römer', 'Romans', 'Romanos', 'Röm', 'Rom')],
	['1kor', nt('1 Korinther', '1 Corinthians', '1 Corinthios', '1Kor', '1Cor')],
	['2kor', nt('2 Korinther', '2 Corinthians', '2 Corinthios', '2Kor', '2Cor')],
	['gal', nt('Galater', 'Galatians', 'Galatas', 'Gal', 'Gal')],
	['eph', nt('Epheser', 'Ephesians', 'Ephesios', 'Eph', 'Eph')],
	['phil', nt('Philipper', 'Philippians', 'Philippenses', 'Phil', 'Phil')],
	['kol', nt('Kolosser', 'Colossians', 'Colossenses', 'Kol', 'Col')],
	['1thess', nt('1 Thessalonicher', '1 Thessalonians', '1 Thessalonicenses', '1Thes', '1Thes')],
	['2thess', nt('2 Thessalonicher', '2 Thessalonians', '2 Thessalonicenses', '2Thes', '2Thes')],
	['1tim', nt('1 Timotheus', '1 Timothy', '1 Timotheum', '1Tim', '1Tim')],
	['2tim', nt('2 Timotheus', '2 Timothy', '2 Timotheum', '2Tim', '2Tim')],
	['tit', nt('Titus', 'Titus', 'Titum', 'Tit', 'Ti')],
	['phlm', nt('Philemon', 'Philemon', 'Philemonem', 'Phim', 'Phlm')],
	['hebr', nt('Hebräer', 'Hebrews', 'Hebraeos', 'Heb', 'Heb')],
	['jak', nt('Jakobus', 'James', 'Iacobi', 'Jak', 'Jas')],
	['1petr', nt('1 Petrus', '1 Peter', '1 Petri', '1Petr', '1Pt')],
	['2petr', nt('2 Petrus', '2 Peter', '2 Petri', '2Petr', '2Pt')],
	['1joh', nt('1 Johannes', '1 John', '1 Ioannis', '1Jo', '1Jn')],
	['2joh', nt('2 Johannes', '2 John', '2 Ioannis', '2Jo', '2Jn')],
	['3joh', nt('3 Johannes', '3 John', '3 Ioannis', '3Jo', '3Jn')],
	['jud', nt('Judas', 'Jude', 'Iudae', 'Jud', 'Jude')],
	['offb', nt('Offenbarung', 'Apocalypse', 'Apocalypsis', 'Offb', 'Apo')]
];

export const CANON: Record<string, CanonEntry> = Object.fromEntries(
	LIST.map(([slug, e], i) => [slug, { order: i + 1, ...e }])
);

/** "Röm" → "roem": the umlaut-free spelling a plain keyboard produces. */
export function foldUmlauts(text: string): string {
	return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); // ß-ok
}

const BY_FOLDED: Record<string, string> = Object.fromEntries(Object.keys(CANON).map((slug) => [foldUmlauts(slug), slug]));

/**
 * The canon slug for a book as typed in a URL or a reference: the proper
 * abbreviation ("Röm") or its keyboard-friendly form ("Roem"), any case.
 * Links always use the umlaut form; this is only for what comes in.
 */
export function canonSlug(input: string): string | null {
	const lower = input.toLowerCase();
	if (lower in CANON) return lower;
	return BY_FOLDED[foldUmlauts(lower)] ?? BY_OTHER[lower.replace(/[\s.]/g, '')] ?? null;
}

// The TSV files' and the Douay-Rheims' abbreviations and the full names in all
// three languages too ("1Mo", "Jn", "Acts", "1 Cor", "Ecclesiastes", "Römer"),
// lower-cased and without spaces, so citations written any of these ways resolve.
const BY_OTHER: Record<string, string> = Object.fromEntries([
	...Object.entries(CANON).flatMap(([slug, e]) => [e.tsv, e.drb, e.de, e.en, e.la].filter((a): a is string => !!a).map((a) => [a.toLowerCase().replace(/[\s.]/g, ''), slug])),
	// Spellings the catechesis and older books use.
	['dt', 'dtn'], ['deut', 'dtn'], ['pred', 'koh'], ['psalm', 'ps'], ['is', 'jes'], ['isaias', 'jes'], ['apok', 'offb'], ['rev', 'offb'],
	// The names `scriptureLookup` prints for the apologetics ("1 Mose", "Sprüche") and English ones outside the Douay.
	['1mose', 'gen'],
	['2mose', 'ex'],
	['3mose', 'lev'],
	['4mose', 'num'],
	['5mose', 'dtn'],
	['joshua', 'jos'],
	['1chronicles', '1chr'],
	['2chronicles', '2chr'],
	['ezra', 'esra'],
	['nehemiah', 'neh'],
	['hiob', 'ijob'],
	['psalm', 'ps'],
	['sprüche', 'spr'],
	['songofsolomon', 'hld'],
	['isaiah', 'jes'],
	['jeremiah', 'jer'],
	['hesekiel', 'ez'],
	['obadiah', 'obd'],
	['jonah', 'jona'],
	['micah', 'mi'],
	['habakkuk', 'hab'],
	['zephaniah', 'zef'],
	['zephanja', 'zef'],
	['zechariah', 'sach'],
	['malachi', 'mal'],
	['revelation', 'offb']
]);

const BY_TSV: Record<string, string> = Object.fromEntries(Object.entries(CANON).flatMap(([slug, e]) => (e.tsv ? [[e.tsv, slug]] : [])));
const BY_DRB: Record<string, string> = Object.fromEntries(Object.entries(CANON).flatMap(([slug, e]) => (e.drb ? [[e.drb, slug]] : [])));

/** Canon slug for an abbreviation as `allioli.tsv` ("1Mo") or `drb.tsv` ("Gn") spells it. */
export function slugFromTsv(abbreviation: string): string | null {
	return BY_TSV[abbreviation] ?? null;
}
export function slugFromDrb(abbreviation: string): string | null {
	return BY_DRB[abbreviation] ?? null;
}

/** Reader address of a verse: /glaube/bibel/joh/3#16, per language. */
export function bibleVersePath(lang: 'de' | 'en' | 'la', slug: string, chapter: number, verse?: number): string {
	const section = lang === 'en' ? 'faith/bible' : lang === 'la' ? 'fides/biblia' : 'glaube/bibel';
	return `/${section}/${encodeURIComponent(slug)}/${chapter}${verse ? `#${verse}` : ''}`;
}

export function canonEntry(slug: string): CanonEntry | null {
	return CANON[canonSlug(slug) ?? ''] ?? null;
}

export function bookName(slug: string, lang: 'de' | 'en' | 'la'): string {
	const e = canonEntry(slug);
	return e ? e[lang] : slug;
}

/** Slugs in canon order, split by testament. */
export const CANON_BY_TESTAMENT = {
	ot: LIST.filter(([, e]) => e.testament === 'ot').map(([s]) => s),
	nt: LIST.filter(([, e]) => e.testament === 'nt').map(([s]) => s)
};
