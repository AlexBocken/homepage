import type { SeasonAnchorKey, SeasonEndpoint, SeasonRange } from '$types/types';
import { getLiturgicalAnchors } from './easter.svelte';

function midnight(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}

function lastDayOfMonth(year: number, month1to12: number): number {
	return new Date(year, month1to12, 0).getDate();
}

function clampDay(year: number, month1to12: number, day: number): number {
	const last = lastDayOfMonth(year, month1to12);
	return Math.min(Math.max(day, 1), last);
}

export function resolveEndpoint(
	ep: SeasonEndpoint,
	year: number,
	anchors: Record<SeasonAnchorKey, Date> = getLiturgicalAnchors(year)
): Date {
	if (ep.kind === 'fixed') {
		return new Date(year, ep.m - 1, clampDay(year, ep.m, ep.d));
	}
	return midnight(addDays(anchors[ep.anchor], ep.offsetDays || 0));
}

/**
 * Resolve a range against multiple candidate years. A range like
 * `christmas + 0 → christmas + 7` resolved in year Y produces the interval
 * Dec 25 Y .. Jan 1 Y+1; resolved in Y-1 produces Dec 25 Y-1 .. Jan 1 Y.
 * Callers pass `[Y-1, Y, Y+1]` so a test date sees both wrapping intervals.
 */
function intervalsForYears(range: SeasonRange, years: number[]): Array<{ start: Date; end: Date }> {
	const out: Array<{ start: Date; end: Date }> = [];
	for (const y of years) {
		const anchors = getLiturgicalAnchors(y);
		const start = midnight(resolveEndpoint(range.start, y, anchors));
		const end = midnight(resolveEndpoint(range.end, y, anchors));
		// If the resolved start is after the resolved end, it is a same-year wrap
		// (e.g. fixed 12-25 → 01-01 within year Y). Treat as two slices: [start, Dec 31 Y]
		// and [Jan 1 Y, end]. Most ranges go single-slice — this only catches
		// the case where the user wrote a same-year wrap with two fixed endpoints.
		if (start.getTime() <= end.getTime()) {
			out.push({ start, end });
		} else {
			out.push({ start, end: new Date(y, 11, 31) });
			out.push({ start: new Date(y, 0, 1), end });
		}
	}
	return out;
}

export function isDateInRange(range: SeasonRange, date: Date): boolean {
	const d = midnight(date);
	const y = d.getFullYear();
	const intervals = intervalsForYears(range, [y - 1, y, y + 1]);
	const t = d.getTime();
	for (const iv of intervals) {
		if (t >= iv.start.getTime() && t <= iv.end.getTime()) return true;
	}
	return false;
}

type RecipeWithRanges = { seasonRanges?: SeasonRange[] };

export function isRecipeInSeason(recipe: RecipeWithRanges, date: Date = new Date()): boolean {
	const ranges = recipe.seasonRanges;
	if (!ranges || ranges.length === 0) return false;
	for (const r of ranges) {
		if (isDateInRange(r, date)) return true;
	}
	return false;
}

/**
 * Whether any resolved interval of `range` (across years Y-1, Y, Y+1) overlaps
 * any day of `month` (1–12) in year Y. Used by the legacy `?season=N` URL filter.
 */
export function rangeOverlapsMonth(range: SeasonRange, month: number, year: number = new Date().getFullYear()): boolean {
	const monthStart = new Date(year, month - 1, 1).getTime();
	const monthEnd = new Date(year, month - 1, lastDayOfMonth(year, month)).getTime();
	const intervals = intervalsForYears(range, [year - 1, year, year + 1]);
	for (const iv of intervals) {
		if (iv.start.getTime() <= monthEnd && iv.end.getTime() >= monthStart) return true;
	}
	return false;
}

export function recipeOverlapsMonth(recipe: RecipeWithRanges, month: number, year: number = new Date().getFullYear()): boolean {
	const ranges = recipe.seasonRanges;
	if (!ranges || ranges.length === 0) return false;
	for (const r of ranges) {
		if (rangeOverlapsMonth(r, month, year)) return true;
	}
	return false;
}

const DAY_MS = 86_400_000;

/** Whole days between two midnights. */
function daysBetween(a: Date, b: Date): number {
	return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Merge overlapping or back-to-back intervals into the smallest covering set. */
function mergeIntervals(intervals: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> {
	if (intervals.length < 2) return intervals;
	const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
	const out = [sorted[0]];
	for (const iv of sorted.slice(1)) {
		const last = out[out.length - 1];
		// `+ DAY_MS` so Apr 1–Apr 30 and May 1–May 31 count as one 61-day window
		// rather than two — the window a cook experiences is the union.
		if (iv.start.getTime() <= last.end.getTime() + DAY_MS) {
			if (iv.end.getTime() > last.end.getTime()) out[out.length - 1] = { start: last.start, end: iv.end };
		} else {
			out.push(iv);
		}
	}
	return out;
}

/** Every interval a recipe's ranges resolve to across years Y-1 … Y+1, merged. */
function recipeIntervals(recipe: RecipeWithRanges, year: number): Array<{ start: Date; end: Date }> {
	const ranges = recipe.seasonRanges;
	if (!ranges || ranges.length === 0) return [];
	const all: Array<{ start: Date; end: Date }> = [];
	for (const r of ranges) all.push(...intervalsForYears(r, [year - 1, year, year + 1]));
	return mergeIntervals(all);
}

export type SeasonWindow = {
	start: Date;
	end: Date;
	/** Inclusive length of the window in days — 1 for a single-day season. */
	lengthDays: number;
	/** Days until the window shuts, 0 on its last day. */
	daysLeft: number;
	/** Days since it opened, 0 on its first day. */
	daysIn: number;
};

/**
 * The season window a recipe is *currently* inside, or null if it is out of
 * season. Adjacent and overlapping ranges merge first, so a recipe split into
 * two touching ranges reports the one window a cook actually experiences.
 *
 * `lengthDays` is what the listing ranks on: a two-day window outranks a
 * six-month one because the chance to cook it is about to be gone.
 */
export function activeSeasonWindow(recipe: RecipeWithRanges, date: Date = new Date()): SeasonWindow | null {
	const d = midnight(date);
	const t = d.getTime();
	for (const iv of recipeIntervals(recipe, d.getFullYear())) {
		if (t >= iv.start.getTime() && t <= iv.end.getTime()) {
			return {
				start: iv.start,
				end: iv.end,
				lengthDays: daysBetween(iv.start, iv.end) + 1,
				daysLeft: daysBetween(d, iv.end),
				daysIn: daysBetween(iv.start, d)
			};
		}
	}
	return null;
}


/**
 * Format a resolved range as a human-readable string for the editor preview,
 * resolved against `year`. Fixed/fixed renders as `Mar 1 – Mar 31`; ranges
 * touching liturgical anchors include the year for clarity since they shift.
 */
export function formatRangePreview(range: SeasonRange, year: number, lang: 'de' | 'en' = 'de'): string {
	const anchors = getLiturgicalAnchors(year);
	const start = midnight(resolveEndpoint(range.start, year, anchors));
	const end = midnight(resolveEndpoint(range.end, year, anchors));
	const fmt = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'de-DE', { month: 'short', day: 'numeric' });
	const includesAnchor = range.start.kind === 'liturgical' || range.end.kind === 'liturgical';
	const yearTag = includesAnchor ? ` (${year})` : '';
	return `${fmt.format(start)} – ${fmt.format(end)}${yearTag}`;
}
