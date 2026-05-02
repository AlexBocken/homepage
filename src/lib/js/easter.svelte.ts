/**
 * Compute Easter Sunday for a given year (Anonymous Gregorian algorithm).
 */
export function computeEaster(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

/** Strip time component for date-only comparison. */
function toMidnight(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Check if a date falls within the Regina Caeli period
 * (Easter Sunday through Saturday after Pentecost, inclusive).
 * Pentecost = Easter + 49 days; Saturday after = Easter + 55 days.
 */
export function isEastertide(date: Date = new Date()): boolean {
	const year = date.getFullYear();
	const easter = computeEaster(year);
	const satAfterPentecost = new Date(easter);
	satAfterPentecost.setDate(satAfterPentecost.getDate() + 55);
	const d = toMidnight(date);
	return d >= easter && d <= satAfterPentecost;
}

/**
 * Check if a date falls within Lent (Ash Wednesday to Holy Saturday, inclusive).
 * Ash Wednesday = Easter − 46 days; Holy Saturday = Easter − 1 day.
 */
export function isLent(date: Date = new Date()): boolean {
	const year = date.getFullYear();
	const easter = computeEaster(year);
	const ashWednesday = new Date(easter);
	ashWednesday.setDate(ashWednesday.getDate() - 46);
	const holySaturday = new Date(easter);
	holySaturday.setDate(holySaturday.getDate() - 1);
	const d = toMidnight(date);
	return d >= ashWednesday && d <= holySaturday;
}

export type LiturgicalSeason = 'eastertide' | 'lent' | null;

/**
 * Get the current liturgical season relevant for rosary mystery selection.
 */
export function getLiturgicalSeason(date: Date = new Date()): LiturgicalSeason {
	if (isEastertide(date)) return 'eastertide';
	// Sundays during Lent are "little Easters" — recommend Glorious mysteries, no Lent tag
	if (isLent(date) && date.getDay() !== 0) return 'lent';
	return null;
}

import type { SeasonAnchorKey } from '$types/types';

function addDays(d: Date, days: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}

export function computeAshWednesday(year: number): Date {
	return addDays(computeEaster(year), -46);
}

export function computePalmSunday(year: number): Date {
	return addDays(computeEaster(year), -7);
}

export function computePentecost(year: number): Date {
	return addDays(computeEaster(year), 49);
}

/**
 * First Sunday of Advent: the Sunday on or before December 24, minus 21 days
 * (i.e. the 4th Sunday before Christmas Day).
 */
export function computeAdventI(year: number): Date {
	const dec24 = new Date(year, 11, 24);
	const adventIV = addDays(dec24, -dec24.getDay()); // Sunday on or before Dec 24
	return addDays(adventIV, -21);
}

const anchorCache = new Map<number, Record<SeasonAnchorKey, Date>>();

/**
 * Resolved anchor dates for a given civil year. Memoized — the work is cheap
 * but the season evaluator hits this on every range × every recipe.
 */
export function getLiturgicalAnchors(year: number): Record<SeasonAnchorKey, Date> {
	const cached = anchorCache.get(year);
	if (cached) return cached;
	const anchors: Record<SeasonAnchorKey, Date> = {
		easter: computeEaster(year),
		'ash-wednesday': computeAshWednesday(year),
		'palm-sunday': computePalmSunday(year),
		pentecost: computePentecost(year),
		'advent-i': computeAdventI(year)
	};
	anchorCache.set(year, anchors);
	return anchors;
}
