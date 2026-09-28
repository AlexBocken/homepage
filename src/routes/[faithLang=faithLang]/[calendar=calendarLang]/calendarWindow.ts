/**
 * Day arithmetic and season lookup shared by the calendar's ring and hills
 * views. Both lay the liturgical year out over a window of ISO days
 * [windowStart, windowEnd) and position everything by its day offset in it.
 */
import type { CalendarLang } from './calendarI18n';

type Arc = { start: string; end: string };
type Dated = { iso: string };

const DAY_MS = 86400000;

/** Midnight UTC of an ISO `YYYY-MM-DD` day, in epoch ms. */
export function isoToUTC(iso: string): number {
	const [yy, mm, dd] = iso.split('-').map(Number);
	return Date.UTC(yy, mm - 1, dd);
}

/** Days from `windowStart` to `iso`. */
export function dayOfWindow(iso: string, windowStart: string): number {
	return Math.floor((isoToUTC(iso) - isoToUTC(windowStart)) / DAY_MS);
}

/** Whether `iso` falls in [windowStart, windowEnd). */
export function isoInWindow(iso: string | null | undefined, windowStart: string, windowEnd: string): boolean {
	return !!iso && iso >= windowStart && iso < windowEnd;
}

/** The number of days in the window. */
export function windowDays(windowStart: string, windowEnd: string): number {
	return Math.floor((isoToUTC(windowEnd) - isoToUTC(windowStart)) / DAY_MS);
}

/** The season arc that contains `iso`, if any. */
export function arcContaining<A extends Arc>(arcs: A[], iso: string | null | undefined): A | null {
	return iso ? (arcs.find((s) => iso >= s.start && iso <= s.end) ?? null) : null;
}

/**
 * The season the panel shows: the one holding the selected day, else the
 * current one (`currentArc`), else the first.
 */
export function activeArc<A extends Arc>(arcs: A[], selectedIso: string | null, currentArc: A | null): A | null {
	if (selectedIso) {
		const hit = arcContaining(arcs, selectedIso);
		if (hit) return hit;
	}
	return currentArc ?? arcs[0] ?? null;
}

/** The feasts that fall inside a season. */
export function feastsIn<F extends Dated>(feasts: F[], arc: Arc | null): F[] {
	if (!arc) return [] as F[];
	return feasts.filter((d) => d.iso >= arc.start && d.iso <= arc.end);
}

/** A day as "5 Apr" / "5. Apr." in the view's language. */
export function fmtShort(iso: string, lang: CalendarLang): string {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** A span of days, "5 Apr – 24 May". */
export function fmtRange(a: string, b: string, lang: CalendarLang): string {
	return `${fmtShort(a, lang)} – ${fmtShort(b, lang)}`;
}
