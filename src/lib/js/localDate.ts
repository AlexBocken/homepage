/**
 * Local calendar-day helpers.
 *
 * The label for "today" must be derived from the *local* calendar day, NOT via
 * `toISOString()` (which converts to UTC first and rolls back a day in the small
 * hours for positive-offset timezones, e.g. 01:00 CEST -> yesterday).
 *
 * Used wherever a `YYYY-MM-DD` label must match the user's wall-clock day:
 * fitness food-log / measurement keys, date pickers, streak stores, etc.
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
