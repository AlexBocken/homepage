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

// Rank emphasis for visual weighting of cells
export function rankEmphasis(rank: string): number {
	if (rank === 'SOLEMNITY') return 3;
	if (rank === 'FEAST' || rank === 'SUNDAY' || rank === 'HOLY_DAY_OF_OBLIGATION') return 2;
	if (rank === 'MEMORIAL') return 1;
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
		en: 'The 1962 calendar is derived from divinum-officium data and is still being checked day-by-day against authoritative sources. Local proper calendars (diocese, religious order, national feasts) are not yet applied — only the general Roman calendar is rendered.',
		de: 'Der Kalender für den Ritus von 1962 stammt aus divinum-officium-Daten und wird noch Tag für Tag mit maßgeblichen Quellen abgeglichen. Eigenkalender (Diözese, Ordensgemeinschaft, Landesfeste) sind noch nicht berücksichtigt — dargestellt wird nur der allgemeine römische Kalender.',
		la: 'Calendarium anni 1962 ex datis divinum-officium ductum est et adhuc diebus singulis contra fontes fideles examinatur. Calendaria propria localia (dioecesis, ordinis religiosi, festa nationalia) nondum adhibentur — tantum calendarium Romanum generale ostenditur.'
	}
};

export function t(key: keyof typeof ui, lang: CalendarLang): string {
	return ui[key][lang] ?? ui[key].en;
}

export type Rite = '1969' | '1962';
export function isValidRite(v: string | null): v is Rite {
	return v === '1969' || v === '1962';
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
	TimeAfterPentecost: { en: 'after Pentecost', de: 'nach Pfingsten', la: 'post Pentecosten' }
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
	rubrics: { en: 'Rubrics', de: 'Rubriken', la: 'Rubricæ' },
	gloria: { en: 'Gloria', de: 'Gloria', la: 'Gloria' },
	credo: { en: 'Credo', de: 'Credo', la: 'Credo' },
	preface: { en: 'Preface', de: 'Präfation', la: 'Præfatio' },
	lastGospel: { en: 'Last Gospel', de: 'Letztes Evangelium', la: 'Ultimum Evangelium' },
	ite: { en: 'Dismissal', de: 'Entlassung', la: 'Dimissio' },
	octave: { en: 'Octave', de: 'Oktav', la: 'Octava' },
	octaveDay: { en: 'day', de: 'Tag', la: 'dies' },
	vigilOf: { en: 'Vigil of', de: 'Vigil von', la: 'Vigilia' },
	transferredFrom: { en: 'Transferred from', de: 'Übertragen von', la: 'Translatum ex' },
	source: { en: 'Source', de: 'Quelle', la: 'Fons' },
	yes: { en: 'yes', de: 'ja', la: 'sic' },
	no: { en: 'no', de: 'nein', la: 'non' },
	properRef: { en: 'Proper', de: 'Proprium', la: 'Proprium' },
	propers: { en: 'Mass propers', de: 'Messproprium', la: 'Propria Missæ' },
	extraSections: { en: 'Additional readings', de: 'Zusätzliche Lesungen', la: 'Lectiones additae' }
} as const;

export function t1962(key: keyof typeof ui1962, lang: CalendarLang): string {
	return ui1962[key][lang] ?? ui1962[key].en;
}

const PROPER_LABEL: Record<string, Record<CalendarLang, string>> = {
	introit: { en: 'Introit', de: 'Introitus', la: 'Introitus' },
	collect: { en: 'Collect', de: 'Kollekte', la: 'Collecta' },
	epistle: { en: 'Epistle', de: 'Epistel', la: 'Epistola' },
	gradual: { en: 'Gradual', de: 'Graduale', la: 'Graduale' },
	alleluia: { en: 'Alleluia', de: 'Alleluja', la: 'Alleluia' },
	tract: { en: 'Tract', de: 'Tractus', la: 'Tractus' },
	sequence: { en: 'Sequence', de: 'Sequenz', la: 'Sequentia' },
	gospel: { en: 'Gospel', de: 'Evangelium', la: 'Evangelium' },
	offertory: { en: 'Offertory', de: 'Offertorium', la: 'Offertorium' },
	secret: { en: 'Secret', de: 'Stillgebet', la: 'Secreta' },
	preface: { en: 'Preface', de: 'Präfation', la: 'Præfatio' },
	communion: { en: 'Communion', de: 'Kommunion', la: 'Communio' },
	postcommunion: { en: 'Postcommunion', de: 'Schlussgebet', la: 'Postcommunio' }
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
