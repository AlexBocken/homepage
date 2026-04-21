// Liturgical color tokens used by the overview design.
// Maps romcal color keys to the CSS variables defined on the calendar page.

// Romcal never emits GOLD for either rite, so it is excluded from the legend
// and lookup here. The --lit-gold token still exists for today-pin styling.
export const LIT_COLOR_VAR: Record<string, string> = {
	WHITE: '--lit-white',
	RED: '--lit-red',
	GREEN: '--lit-green',
	PURPLE: '--lit-violet',
	ROSE: '--lit-rose',
	BLACK: '--lit-black'
};

export const LIT_INK_VAR: Record<string, string> = {
	WHITE: '--lit-white-ink',
	RED: '--lit-red-ink',
	GREEN: '--lit-green-ink',
	PURPLE: '--lit-violet-ink',
	ROSE: '--lit-rose-ink',
	BLACK: '--lit-black-ink'
};

export function litBg(colorKey: string | undefined): string {
	const v = colorKey ? LIT_COLOR_VAR[colorKey] : undefined;
	return v ? `var(${v})` : 'var(--color-bg-primary)';
}

export function litInk(colorKey: string | undefined): string {
	const v = colorKey ? LIT_INK_VAR[colorKey] : undefined;
	return v ? `var(${v})` : 'var(--color-text-primary)';
}

// Default color per liturgical season. Used to paint ring arcs even when the
// first day of a season falls on a feast of a different color.
const SEASON_COLOR_MAP: Record<string, string> = {
	// 1962 seasons
	Advent: 'PURPLE',
	ChristmasTide: 'WHITE',
	EpiphanyTide: 'GREEN',
	Septuagesima: 'PURPLE',
	Lent: 'PURPLE',
	Passiontide: 'PURPLE',
	HolyWeek: 'PURPLE',
	EasterWeek: 'WHITE',
	Paschaltide: 'WHITE',
	AscensionTide: 'WHITE',
	Pentecost: 'RED',
	TimeAfterPentecost: 'GREEN',
	// 1969 seasons (variant keys)
	ADVENT: 'PURPLE',
	CHRISTMAS_TIME: 'WHITE',
	ORDINARY_TIME: 'GREEN',
	LENT: 'PURPLE',
	PASCHAL_TRIDUUM: 'RED',
	EASTER_TIME: 'WHITE'
};

export function seasonColorFor(seasonKey: string | undefined, fallback = 'GREEN'): string {
	if (!seasonKey) return fallback;
	return SEASON_COLOR_MAP[seasonKey] ?? fallback;
}

// Dot size in the ring scales with rank. Accepts both 1962 class labels and
// 1969 rank keys.
export function rankDotSize(rank: string): number {
	if (rank === 'ClassI' || rank === 'SOLEMNITY') return 5;
	if (rank === 'ClassII' || rank === 'FEAST' || rank === 'SUNDAY' || rank === 'HOLY_DAY_OF_OBLIGATION')
		return 4;
	if (rank === 'ClassIII' || rank === 'MEMORIAL') return 3;
	if (rank === 'ClassIV') return 2;
	return 0; // 1969 weekdays/opt-memorials still skipped
}
