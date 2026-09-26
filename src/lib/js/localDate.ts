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

/** Zero-pad a month, day or hour to two digits: `7` -> `"07"`. */
export function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/** Local `YYYY-MM-DD` for the given date (defaults to now). */
export function localDateStr(d: Date = new Date()): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local `YYYY-MM-DD` for today, offset by `days` (negative = past). */
export function localDateOffset(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return localDateStr(d);
}

/**
 * The calendar day at a UTC offset, given as `Date.prototype.getTimezoneOffset`
 * reports it (minutes *behind* UTC: Zurich in summer is -120). Lets the
 * server name a reader's "today" from a long-lived offset cookie instead of
 * trusting a date the client wrote yesterday.
 */
export function localDateStrAtOffset(offsetMinutes: number, now: number = Date.now()): string {
	const d = new Date(now - offsetMinutes * 60_000);
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
