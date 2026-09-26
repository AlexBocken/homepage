/**
 * Day-key arithmetic for the daily stats charts. Pure (no runes) — the
 * zoom-state helper built on it is `$lib/fitness/chartRange.svelte`.
 */

export const DAY_MS = 86400000;

export interface XRange {
	min: number;
	max: number;
}

/** Epoch ms of a `YYYY-MM-DD` day key (UTC midnight, as the day keys are stored). */
export function dayStamp(date: string): number {
	return new Date(date + 'T00:00:00.000Z').getTime();
}

/**
 * Every calendar day from `start` to `end` inclusive, as `YYYY-MM-DD`, gaps
 * included — so a day with nothing logged is a null in the chart rather than a
 * skipped column. Stepped in UTC, so local DST changes cannot drop or repeat a
 * day. Empty when either bound is missing or `start` is after `end`.
 */
export function enumerateDays(start: string | null | undefined, end: string | null | undefined): string[] {
	const out: string[] = [];
	if (!start || !end) return out;
	let cur = new Date(start + 'T00:00:00.000Z');
	const last = new Date(end + 'T00:00:00.000Z');
	while (cur <= last) {
		out.push(cur.toISOString().slice(0, 10));
		cur = new Date(cur.getTime() + DAY_MS);
	}
	return out;
}

/**
 * The last `days` days of a chronological day list (inclusive of the last
 * day), clipped to where the list starts. Null for an empty list.
 */
export function trailingDaysRange(dates: string[], days: number): XRange | null {
	if (!dates.length) return null;
	const max = dayStamp(dates[dates.length - 1]);
	const min = Math.max(dayStamp(dates[0]), max - (days - 1) * DAY_MS);
	return { min, max };
}
