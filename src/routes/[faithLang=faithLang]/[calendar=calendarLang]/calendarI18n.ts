export type CalendarLang = 'en' | 'de' | 'la';

const langPairs = {
	faith: { lang: 'en' as const, slug: 'calendar' },
	glaube: { lang: 'de' as const, slug: 'kalender' },
	fides: { lang: 'la' as const, slug: 'calendarium' }
};

export function expectedSlug(faithLang: string): string | null {
	return langPairs[faithLang as keyof typeof langPairs]?.slug ?? null;
}

const intlLocale: Record<CalendarLang, string> = { en: 'en-US', de: 'de-DE', la: 'la' };

export function getMonthName(month: number, lang: CalendarLang): string {
	try {
		return new Intl.DateTimeFormat(intlLocale[lang], { month: 'long' }).format(new Date(2000, month, 1));
	} catch {
		return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, month, 1));
	}
}

export function getWeekdayShort(weekday: number, lang: CalendarLang): string {
	const d = new Date(2000, 0, 2 + weekday);
	try {
		return new Intl.DateTimeFormat(intlLocale[lang], { weekday: 'short' }).format(d);
	} catch {
		return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
	}
}

export function formatLongDate(iso: string, lang: CalendarLang): string {
	const d = new Date(iso);
	try {
		return new Intl.DateTimeFormat(intlLocale[lang], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(d);
	} catch {
		return d.toDateString();
	}
}

// Hex for each liturgical color key returned by romcal
export const colorHex: Record<string, string> = {
	WHITE: '#F5F5F0',
	RED: '#C0392B',
	GREEN: '#27AE60',
	PURPLE: '#7D4E9C',
	ROSE: '#E8A4B8',
	BLACK: '#2E3440',
	GOLD: '#D4A64A'
};

export function hexFor(colorKeys: string[]): string {
	const first = colorKeys[0];
	return colorHex[first] ?? '#27AE60';
}

// Rank emphasis for visual weighting of cells. Accepts both 1969 rank keys and
// 1962 class labels (ClassI..IV), since 1962 days are emphasized similarly.
export function rankEmphasis(rank: string): number {
	if (rank === 'SOLEMNITY' || rank === 'ClassI') return 3;
	if (
		rank === 'FEAST' ||
		rank === 'SUNDAY' ||
		rank === 'HOLY_DAY_OF_OBLIGATION' ||
		rank === 'ClassII'
	)
		return 2;
	if (rank === 'MEMORIAL' || rank === 'ClassIII') return 1;
	return 0;
}

export function humanizePsalterWeek(raw: string | null, lang: CalendarLang): string | null {
	if (!raw) return null;
	// raw is e.g. "WEEK_1"
	const m = raw.match(/^WEEK_(\d)$/);
	if (!m) return raw;
	const n = m[1];
	const romans: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
	return romans[n] ?? n;
}

export function humanizeSundayCycle(raw: string | null): string | null {
	if (!raw) return null;
	// e.g. "YEAR_A" → "A"
	const m = raw.match(/^YEAR_([A-C])$/);
	return m ? m[1] : raw;
}

export const ui = {
	today: { en: 'Today', de: 'Heute', la: 'Hodie' },
	calendar: { en: 'Liturgical Calendar', de: 'Liturgischer Kalender', la: 'Calendarium Liturgicum' },
	jumpToToday: { en: 'Jump to today', de: 'Zu heute', la: 'Ad hodiernum' },
	prev: { en: 'Previous month', de: 'Vorheriger Monat', la: 'Mensis praecedens' },
	next: { en: 'Next month', de: 'Nächster Monat', la: 'Mensis sequens' },
	psalterWeek: { en: 'Psalter week', de: 'Psalterwoche', la: 'Hebdomada psalterii' },
	cycle: { en: 'Sunday cycle', de: 'Lesejahr', la: 'Cyclus dominicalis' },
	rite1969Long: {
		en: 'Roman Missal of 1969 (Ordinary Form)',
		de: 'Römisches Messbuch 1969 (Ordentliche Form)',
		la: 'Missale Romanum 1969 (Forma Ordinaria)'
	},
	rite1962Long: {
		en: 'Roman Missal of 1962 (Extraordinary Form)',
		de: 'Römisches Messbuch 1962 (Ausserordentliche Form)',
		la: 'Missale Romanum 1962 (Forma Extraordinaria)'
	},
	wipTitle: {
		en: 'Work in progress',
		de: 'In Arbeit',
		la: 'In opere'
	},
	wipBody: {
		en: 'The calendar for the older rite (1962 Missal) is not yet available. Stay tuned.',
		de: 'Der Kalender für den alten Ritus (Messbuch 1962) ist noch nicht verfügbar. Bleib dran.',
		la: 'Calendarium ritus antiqui (Missale 1962) nondum paratum est. Exspecta paulisper.'
	},
	rite1962DisclaimerTitle: {
		en: 'Accuracy still being verified',
		de: 'Genauigkeit wird noch geprüft',
		la: 'Accuratio adhuc probanda'
	},
	rite1962DisclaimerBody: {
		en: 'The 1962 calendar is derived from divinum-officium data and is still being checked day-by-day against authoritative sources. Only the Swiss diocesan propers shipped by romcal are applied; other national/local calendars are not yet available.',
		de: 'Der Kalender für den Ritus von 1962 stammt aus divinum-officium-Daten und wird noch Tag für Tag mit maßgeblichen Quellen abgeglichen. Nur die in romcal enthaltenen Schweizer Diözesankalender werden angewendet; weitere Landes- oder Ortskalender sind noch nicht verfügbar.',
		la: 'Calendarium anni 1962 ex datis divinum-officium ductum est et adhuc diebus singulis contra fontes fideles examinatur. Tantum calendaria propria dioecesium Helvetiae a romcal provisa adhibentur; cetera calendaria nationalia vel localia nondum praesto sunt.'
	},
	calendarVariant: {
		en: 'Calendar',
		de: 'Kalender',
		la: 'Calendarium'
	},
	rite1969SwissNote: {
		en: 'romcal ships only a national Swiss calendar for 1969 — diocesan sub-calendars are not available for this rite.',
		de: 'romcal liefert für 1969 nur einen nationalen Schweizer Kalender — diözesane Unterkalender sind für diesen Ritus nicht verfügbar.',
		la: 'Pro anno 1969 romcal solum calendarium Helvetiae nationale praebet — calendaria dioecesana propria pro hoc ritu non adsunt.'
	}
};

export function t(key: keyof typeof ui, lang: CalendarLang): string {
	return ui[key][lang] ?? ui[key].en;
}

export type Rite = 'novus' | 'vetus';
export function isValidRite(v: string | null): v is Rite {
	return v === 'novus' || v === 'vetus';
}

// --- Diocese selection ---
// 1962 rite: 7 Swiss dioceses plus the national calendar (all shipped by romcal/1962).
// 1969 rite: romcal only ships a single national Switzerland bundle, so the dropdown
// collapses to "General Roman" or "Switzerland" — diocese sub-choices all resolve to
// the same national bundle and we flag that in the UI.
export type Diocese1962 =
	| 'general'
	| 'switzerland'
	| 'basel'
	| 'chur'
	| 'lausanne-geneva-fribourg'
	| 'lugano'
	| 'saint-maurice-abbey'
	| 'sankt-gallen'
	| 'sion';

export type Diocese1969 = 'general' | 'switzerland';

export const DIOCESES_1962: Diocese1962[] = [
	'general',
	'switzerland',
	'basel',
	'chur',
	'lausanne-geneva-fribourg',
	'lugano',
	'saint-maurice-abbey',
	'sankt-gallen',
	'sion'
];

export const DIOCESES_1969: Diocese1969[] = ['general', 'switzerland'];

export const DEFAULT_DIOCESE_1962: Diocese1962 = 'chur';
export const DEFAULT_DIOCESE_1969: Diocese1969 = 'general';

const DIOCESE_LABEL: Record<string, Record<CalendarLang, string>> = {
	general: {
		en: 'General Roman',
		de: 'Allgemeiner römischer Kalender',
		la: 'Calendarium Romanum Generale'
	},
	switzerland: {
		en: 'Switzerland (national)',
		de: 'Schweiz (national)',
		la: 'Helvetia (nationalis)'
	},
	basel: { en: 'Basel', de: 'Basel', la: 'Basilea' },
	chur: { en: 'Chur', de: 'Chur', la: 'Curia' },
	'lausanne-geneva-fribourg': {
		en: 'Lausanne, Geneva and Fribourg',
		de: 'Lausanne, Genf und Freiburg',
		la: 'Lausanna, Genavensis et Friburgensis'
	},
	lugano: { en: 'Lugano', de: 'Lugano', la: 'Luganensis' },
	'saint-maurice-abbey': {
		en: 'Saint-Maurice Abbey',
		de: 'Abtei Saint-Maurice',
		la: 'Abbatia S. Mauritii'
	},
	'sankt-gallen': { en: 'St. Gallen', de: 'St. Gallen', la: 'Sancti Galli' },
	sion: { en: 'Sion', de: 'Sitten', la: 'Sedunensis' }
};

export function dioceseLabel(id: string, lang: CalendarLang): string {
	return DIOCESE_LABEL[id]?.[lang] ?? id;
}

export function isDiocese1962(v: string | null | undefined): v is Diocese1962 {
	return !!v && (DIOCESES_1962 as string[]).includes(v);
}

export function isDiocese1969(v: string | null | undefined): v is Diocese1969 {
	return !!v && (DIOCESES_1969 as string[]).includes(v);
}

// --- 1962 localization helpers ---
// 1962 calendar data is Latin-only at source (feast names stay Latin —
// they are canonical). UI chrome (rank, season, color) is localized here.

const CLASS_LABEL: Record<string, Record<CalendarLang, string>> = {
	ClassI: { en: 'Class I', de: 'I. Klasse', la: 'I classis' },
	ClassII: { en: 'Class II', de: 'II. Klasse', la: 'II classis' },
	ClassIII: { en: 'Class III', de: 'III. Klasse', la: 'III classis' },
	ClassIV: { en: 'Class IV', de: 'IV. Klasse', la: 'IV classis' },
	Ferial: { en: 'Ferial', de: 'Ferialtag', la: 'Feria' }
};

export function rank1962Label(rank: string, lang: CalendarLang): string {
	return CLASS_LABEL[rank]?.[lang] ?? rank;
}

const SEASON_LABEL: Record<string, Record<CalendarLang, string>> = {
	Advent: { en: 'Advent', de: 'Advent', la: 'Adventus' },
	ChristmasTide: { en: 'Christmastide', de: 'Weihnachtszeit', la: 'Tempus Nativitatis' },
	EpiphanyTide: { en: 'Epiphanytide', de: 'Epiphaniaszeit', la: 'Tempus Epiphaniæ' },
	Septuagesima: { en: 'Septuagesima', de: 'Vorfastenzeit', la: 'Septuagesima' },
	Lent: { en: 'Lent', de: 'Fastenzeit', la: 'Quadragesima' },
	Passiontide: { en: 'Passiontide', de: 'Passionszeit', la: 'Tempus Passionis' },
	HolyWeek: { en: 'Holy Week', de: 'Karwoche', la: 'Hebdomada Sancta' },
	EasterWeek: { en: 'Easter Week', de: 'Osteroktav', la: 'Hebdomada Paschae' },
	Paschaltide: { en: 'Eastertide', de: 'Osterzeit', la: 'Tempus Paschale' },
	Pentecost: { en: 'Pentecost Week', de: 'Pfingstoktav', la: 'Hebdomada Pentecostes' },
	TimeAfterPentecost: { en: 'after Pentecost', de: 'nach Pfingsten', la: 'post Pentecosten' },
	// romcal 3 emits 1969-style SCREAMING_SNAKE season keys even for the 1962 calendar.
	ADVENT: { en: 'Advent', de: 'Advent', la: 'Adventus' },
	CHRISTMAS_TIME: { en: 'Christmastide', de: 'Weihnachtszeit', la: 'Tempus Nativitatis' },
	LENT: { en: 'Lent', de: 'Fastenzeit', la: 'Quadragesima' },
	PASCHAL_TRIDUUM: { en: 'Paschal Triduum', de: 'Ostertriduum', la: 'Triduum Paschale' },
	EASTER_TIME: { en: 'Eastertide', de: 'Osterzeit', la: 'Tempus Paschale' },
	ORDINARY_TIME: { en: 'after Pentecost', de: 'nach Pfingsten', la: 'post Pentecosten' }
};

export function season1962Label(season: string, lang: CalendarLang): string {
	return SEASON_LABEL[season]?.[lang] ?? season;
}

const COLOR_LABEL_1962: Record<string, Record<CalendarLang, string>> = {
	WHITE: { en: 'White', de: 'Weiß', la: 'Albus' },
	RED: { en: 'Red', de: 'Rot', la: 'Ruber' },
	GREEN: { en: 'Green', de: 'Grün', la: 'Viridis' },
	PURPLE: { en: 'Violet', de: 'Violett', la: 'Violaceus' },
	ROSE: { en: 'Rose', de: 'Rosa', la: 'Rosaceus' },
	BLACK: { en: 'Black', de: 'Schwarz', la: 'Niger' },
	GOLD: { en: 'Gold', de: 'Gold', la: 'Aureus' }
};

export function colorLabel1962(colorKey: string, lang: CalendarLang): string {
	return COLOR_LABEL_1962[colorKey]?.[lang] ?? colorKey;
}

export const ui1962 = {
	commemorations: { en: 'Commemorations', de: 'Kommemorationen', la: 'Commemorationes' },
	octave: { en: 'Octave', de: 'Oktav', la: 'Octava' },
	octaveDay: { en: 'day', de: 'Tag', la: 'dies' },
	vigilOf: { en: 'Vigil of', de: 'Vigil von', la: 'Vigilia' },
	transferredFrom: { en: 'Transferred from', de: 'Übertragen von', la: 'Translatum ex' },
	source: { en: 'Source', de: 'Quelle', la: 'Fons' },
	propers: { en: 'Mass propers', de: 'Messproprium', la: 'Propria Missæ' },
	stationChurch: { en: 'Station church', de: 'Stationskirche', la: 'Statio' },
	viewLatin: { en: 'Latin', de: 'Latein', la: 'Latine' },
	viewParallel: { en: 'Parallel', de: 'Parallel', la: 'Parallelum' },
	viewVernacular: { en: 'English', de: 'Deutsch', la: 'Vernacula' },
	fallbackBadge: { en: 'Douay-Rheims', de: 'Allioli', la: 'Vulgata' },
	fallbackHint: {
		en: 'Translation not provided in the missal. Text taken from the Douay-Rheims Bible at the cited reference.',
		de: 'Keine Übersetzung im Messbuch vorhanden. Text aus der Allioli-Bibelübersetzung an der angegebenen Stelle.',
		la: 'Interpretatio localis deest. Textus ex Biblia Sacra locis citatis.'
	}
} as const;

export function t1962(key: keyof typeof ui1962, lang: CalendarLang): string {
	const entry = ui1962[key] as Record<string, string | undefined>;
	return entry[lang] ?? entry.en ?? '';
}

const PROPER_LABEL: Record<string, Record<CalendarLang, string>> = {
	Introitus: { en: 'Introit', de: 'Introitus', la: 'Introitus' },
	Oratio: { en: 'Collect', de: 'Kollekte', la: 'Oratio' },
	Lectio: { en: 'Epistle', de: 'Epistel', la: 'Lectio' },
	Graduale: { en: 'Gradual', de: 'Graduale', la: 'Graduale' },
	GradualeF: { en: 'Alleluia', de: 'Alleluja', la: 'Alleluia' },
	Tractus: { en: 'Tract', de: 'Tractus', la: 'Tractus' },
	Sequentia: { en: 'Sequence', de: 'Sequenz', la: 'Sequentia' },
	Evangelium: { en: 'Gospel', de: 'Evangelium', la: 'Evangelium' },
	Offertorium: { en: 'Offertory', de: 'Offertorium', la: 'Offertorium' },
	Secreta: { en: 'Secret', de: 'Stillgebet', la: 'Secreta' },
	Communio: { en: 'Communion', de: 'Kommunion', la: 'Communio' },
	Postcommunio: { en: 'Postcommunion', de: 'Schlussgebet', la: 'Postcommunio' }
};

export function properLabel(key: string, lang: CalendarLang): string {
	// Ember-Saturday extra readings like LectioL1..LectioL5
	const m = /^LectioL(\d+)$/.exec(key);
	if (m) {
		const n = m[1];
		return lang === 'de' ? `Lesung ${n}` : lang === 'la' ? `Lectio ${n}` : `Reading ${n}`;
	}
	return PROPER_LABEL[key]?.[lang] ?? key;
}
