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

/** The `YYYY-MM-DD` label `days` after (negative: before) the given one. */
export function shiftDay(day: string, days: number): string {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
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

/** One cell of the calendar grid built by {@link monthGrid}. */
export interface MonthGridDay {
	/** `YYYY-MM-DD` label of the cell. */
	date: string;
	year: number;
	/** 0-based month, as `Date#getMonth` gives it. */
	month: number;
	/** Day of the month. */
	day: number;
	/** False for the leading/trailing days of the neighbouring months. */
	currentMonth: boolean;
}

/**
 * The cells of a Monday-first month calendar: the viewed month's days, padded
 * with the previous month's last days in front and the next month's first days
 * behind, to whole weeks (4 to 6 rows — no filler row is added to reach 6).
 * `month` is 0-based; the neighbouring months roll over the year.
 */
export function monthGrid(year: number, month: number): MonthGridDay[] {
	// Monday = 0
	const startDay = (new Date(year, month, 1).getDay() + 6) % 7;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const daysInPrevMonth = new Date(year, month, 0).getDate();

	const days: MonthGridDay[] = [];
	const push = (y: number, mo: number, d: number, currentMonth: boolean) =>
		days.push({ date: `${y}-${pad2(mo + 1)}-${pad2(d)}`, year: y, month: mo, day: d, currentMonth });

	const prevMonth = month === 0 ? 11 : month - 1;
	const prevYear = month === 0 ? year - 1 : year;
	for (let i = startDay - 1; i >= 0; i--) push(prevYear, prevMonth, daysInPrevMonth - i, false);

	for (let d = 1; d <= daysInMonth; d++) push(year, month, d, true);

	const nextMonth = month === 11 ? 0 : month + 1;
	const nextYear = month === 11 ? year + 1 : year;
	const remaining = (7 - (days.length % 7)) % 7;
	for (let d = 1; d <= remaining; d++) push(nextYear, nextMonth, d, false);

	return days;
}
