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
		de: 'Römisches Messbuch 1962 (Außerordentliche Form)',
		la: 'Missale Romanum 1962 (Forma Extraordinaria)'
	},
	wipTitle: {
		en: 'Work in progress',
		de: 'In Arbeit',
		la: 'In opere'
	},
	wipBody: {
		en: 'The 1962 (Tridentine) calendar is not yet available. Stay tuned.',
		de: 'Der tridentinische Kalender von 1962 ist noch nicht verfügbar. Bleib dran.',
		la: 'Calendarium tridentinum anni 1962 nondum paratum est. Exspecta paulisper.'
	}
};

export function t(key: keyof typeof ui, lang: CalendarLang): string {
	return ui[key][lang] ?? ui[key].en;
}

export type Rite = '1969' | '1962';
export function isValidRite(v: string | null): v is Rite {
	return v === '1969' || v === '1962';
}
