/**
 * Local calendar-day helpers for the fitness module.
 *
 * Food-log / measurement entries are string-keyed: each `date` is stored as the
 * UTC-midnight of a `YYYY-MM-DD` *label* and queried back by that same label.
 * The label for "today" must therefore be derived from the *local* calendar day,
 * NOT via `toISOString()` (which converts to UTC first and rolls back a day in
 * the small hours for positive-offset timezones, e.g. 01:00 CEST -> yesterday).
 *
 * Mirrors the rosary streak store's `getToday()`.
 */

/** Local `YYYY-MM-DD` for the given date (defaults to now). */
export function localDateStr(d: Date = new Date()): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local `YYYY-MM-DD` for today, offset by `days` (negative = past). */
export function localDateOffset(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return localDateStr(d);
}
