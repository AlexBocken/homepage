/**
 * ISO-8601 week helpers — the single source of truth for week bucketing across
 * the fitness stats/goal endpoints (previously reimplemented per endpoint).
 */

/** ISO-8601 week number (1–53) for a date, in local time. */
export function isoWeek(date: Date): number {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	// Shift to the Thursday of this week; the ISO week-year is that Thursday's year.
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const week1 = new Date(d.getFullYear(), 0, 4);
	return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * ISO-8601 week-numbering year for a date. Differs from the calendar year for a
 * few days around Jan 1 / Dec 31 (e.g. 2021-01-01 belongs to ISO week-year 2020).
 */
export function isoWeekYear(date: Date): number {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	return d.getFullYear();
}

/** `${isoWeekYear}-${isoWeek}` — a stable per-week bucket key. */
export function isoWeekKey(date: Date): string {
	return `${isoWeekYear(date)}-${isoWeek(date)}`;
}
