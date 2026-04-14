// Map Latin biblical book abbreviations (as used in romcal 1962 propers) to
// the abbreviations used by our bible TSV files (DRB for English, Allioli for
// German). Undefined entries indicate we cannot translate that book yet.

type TargetLang = 'en' | 'de';

// Canonical Latin abbrevs (normalized: lowercase, no periods). We match
// prefixes defensively — "Joan", "Joann", "Joannes" all map the same.
const LATIN_TO_TARGET: Record<string, { en?: string; de?: string }> = {
	gen: { en: 'Gn', de: '1Mo' },
	ex: { en: 'Ex', de: '2Mo' },
	lev: { en: 'Lv', de: '3Mo' },
	num: { en: 'Nm', de: '4Mo' },
	deut: { en: 'Dt', de: '5Mo' },
	jos: { en: 'Jos', de: 'Jos' },
	iud: { en: 'Jgs', de: 'Ri' },
	rut: { en: 'Ru', de: 'Rt' },
	'1reg': { en: '1Kgs', de: '1Sam' },
	'2reg': { en: '2Kgs', de: '2Sam' },
	'3reg': { en: '3Kgs', de: '1Kö' },
	'4reg': { en: '4Kgs', de: '2Kö' },
	'1par': { en: '1Par', de: '1Chr' },
	'2par': { en: '2Par', de: '2Chr' },
	esd: { en: '1Esd', de: 'Esr' },
	neh: { en: '2Esd', de: 'Neh' },
	tob: { en: 'Tb' },
	jdt: { en: 'Jdt' },
	est: { en: 'Est', de: 'Est' },
	job: { en: 'Jb', de: 'Hi' },
	ps: { en: 'Ps', de: 'Ps' },
	prov: { en: 'Prv', de: 'Spr' },
	eccl: { en: 'Eccles', de: 'Pred' },
	cant: { en: 'CCan', de: 'Hl' },
	sap: { en: 'Wis' },
	eccli: { en: 'Ecclus' },
	is: { en: 'Is', de: 'Jes' },
	jer: { en: 'Jer', de: 'Jer' },
	thren: { en: 'Lam', de: 'Kla' },
	bar: { en: 'Bar' },
	ez: { en: 'Ez', de: 'Hes' },
	dan: { en: 'Dn', de: 'Dan' },
	os: { en: 'Os', de: 'Hos' },
	joel: { en: 'Jl', de: 'Joe' },
	am: { en: 'Am', de: 'Am' },
	abd: { en: 'Ab', de: 'Ob' },
	jon: { en: 'Jon', de: 'Jon' },
	mich: { en: 'Mi', de: 'Mi' },
	nah: { en: 'Na', de: 'Nah' },
	hab: { en: 'Hb', de: 'Hab' },
	soph: { en: 'Sph', de: 'Zeph' },
	agg: { en: 'Ag', de: 'Hagg' },
	zach: { en: 'Zac', de: 'Sach' },
	mal: { en: 'Mal', de: 'Mal' },
	'1mach': { en: '1Mac' },
	'2mach': { en: '2Mac' },

	matt: { en: 'Mt', de: 'Mt' },
	marc: { en: 'Mk', de: 'Mk' },
	luc: { en: 'Lk', de: 'Lk' },
	joann: { en: 'Jn', de: 'Joh' },
	act: { en: 'Acts', de: 'Apg' },
	rom: { en: 'Rom', de: 'Röm' },
	'1cor': { en: '1Cor', de: '1Kor' },
	'2cor': { en: '2Cor', de: '2Kor' },
	gal: { en: 'Gal', de: 'Gal' },
	eph: { en: 'Eph', de: 'Eph' },
	phil: { en: 'Phil', de: 'Phil' },
	col: { en: 'Col', de: 'Kol' },
	'1thess': { en: '1Thes', de: '1Thes' },
	'2thess': { en: '2Thes', de: '2Thes' },
	'1tim': { en: '1Tim', de: '1Tim' },
	'2tim': { en: '2Tim', de: '2Tim' },
	tit: { en: 'Ti', de: 'Tit' },
	philm: { en: 'Phlm', de: 'Phim' },
	heb: { en: 'Heb', de: 'Heb' },
	jac: { en: 'Jas', de: 'Jak' },
	'1pet': { en: '1Pt', de: '1Petr' },
	'2pet': { en: '2Pt', de: '2Petr' },
	'1joan': { en: '1Jn', de: '1Jo' },
	'2joan': { en: '2Jn', de: '2Jo' },
	'3joan': { en: '3Jn', de: '3Jo' },
	jud: { en: 'Jude', de: 'Jud' },
	apoc: { en: 'Apo', de: 'Offb' }
};

function normalizeLatinBook(raw: string): string {
	return raw.toLowerCase().replace(/[.\s]/g, '');
}

// Allioli (de) TSV uses Hebrew/modern psalm numbering; DRB (en) uses Vulgate.
// Latin propers are Vulgate, so we shift for de. Only covers the clean +1
// range — Vulgate 9/10, 113–115, 146/147 involve splits/merges and are
// returned unchanged (lookups may miss; acceptable for now).
function mapPsalmChapter(vulgate: number, lang: TargetLang): number {
	if (lang !== 'de') return vulgate;
	if (vulgate >= 10 && vulgate <= 112) return vulgate + 1;
	if (vulgate >= 116 && vulgate <= 145) return vulgate + 1;
	return vulgate;
}

export function translateRefToTarget(ref: string, lang: TargetLang): string | null {
	// ref like "Luc 12:2-8" or "Ps 118:85" or "Matt 5, 17-19"
	const m = ref.trim().match(/^(\d?\s?[A-Za-z]+\.?)\s*(\d.*)$/);
	if (!m) return null;
	const bookNorm = normalizeLatinBook(m[1]);
	const rest = m[2].trim().replace(/;.*$/, '').trim();
	const map = LATIN_TO_TARGET[bookNorm];
	const target = map?.[lang];
	if (!target) return null;
	const clean = rest.replace(/\s*,\s*/, ':').replace(/\s+/g, ' ');

	// Apply psalm numbering shift when the target bible uses a different scheme
	if (bookNorm === 'ps') {
		const cm = clean.match(/^(\d+)(.*)$/);
		if (cm) {
			const shifted = mapPsalmChapter(parseInt(cm[1], 10), lang);
			return `${target} ${shifted}${cm[2]}`;
		}
	}
	return `${target} ${clean}`;
}
