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

/**
 * Check if a date falls within Eastertide (Easter Sunday to Pentecost Sunday, inclusive).
 */
export function isEastertide(date: Date = new Date()): boolean {
	const year = date.getFullYear();
	const easter = computeEaster(year);
	const pentecost = new Date(easter);
	pentecost.setDate(pentecost.getDate() + 49);
	return date >= easter && date <= pentecost;
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
	return date >= ashWednesday && date <= holySaturday;
}

export type LiturgicalSeason = 'eastertide' | 'lent' | null;

/**
 * Get the current liturgical season relevant for rosary mystery selection.
 */
export function getLiturgicalSeason(date: Date = new Date()): LiturgicalSeason {
	if (isEastertide(date)) return 'eastertide';
	if (isLent(date)) return 'lent';
	return null;
}
