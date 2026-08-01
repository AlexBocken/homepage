import { describe, it, expect } from 'vitest';
import { activeSeasonWindow } from '$lib/js/seasonRange';
import type { SeasonRange } from '$types/types';

// The listing ranks in-season recipes by how soon their window shuts, so what
// `activeSeasonWindow` reports about the *length* of that window is the whole
// ordering. These cover the shapes the editor can produce: a plain range, two
// touching ranges, a year-boundary wrap, and a single-day feast.

const fixed = (m: number, d: number) => ({ kind: 'fixed' as const, m, d });
const range = (sm: number, sd: number, em: number, ed: number): SeasonRange => ({
	start: fixed(sm, sd),
	end: fixed(em, ed)
});
const recipe = (...ranges: SeasonRange[]) => ({ seasonRanges: ranges });

describe('activeSeasonWindow', () => {
	it('returns null for a recipe with no ranges', () => {
		expect(activeSeasonWindow({}, new Date(2026, 5, 15))).toBeNull();
	});

	it('returns null outside the window', () => {
		expect(activeSeasonWindow(recipe(range(3, 1, 4, 30)), new Date(2026, 5, 15))).toBeNull();
	});

	it('measures a plain window inclusively', () => {
		const win = activeSeasonWindow(recipe(range(3, 1, 3, 31)), new Date(2026, 2, 10));
		expect(win).not.toBeNull();
		expect(win!.lengthDays).toBe(31);
		expect(win!.daysIn).toBe(9);
		expect(win!.daysLeft).toBe(21);
	});

	it('reports 0 days left on the closing day', () => {
		const win = activeSeasonWindow(recipe(range(3, 1, 3, 31)), new Date(2026, 2, 31));
		expect(win!.daysLeft).toBe(0);
	});

	it('treats a one-day season as one day', () => {
		const win = activeSeasonWindow(recipe(range(12, 26, 12, 26)), new Date(2026, 11, 26));
		expect(win!.lengthDays).toBe(1);
		expect(win!.daysLeft).toBe(0);
	});

	it('merges back-to-back ranges into the one window a cook experiences', () => {
		// April 1–30 and May 1–31 are two ranges but one 61-day opportunity.
		const win = activeSeasonWindow(
			recipe(range(4, 1, 4, 30), range(5, 1, 5, 31)),
			new Date(2026, 3, 15)
		);
		expect(win!.lengthDays).toBe(61);
		expect(win!.daysLeft).toBe(46);
	});

	it('does not merge ranges separated by a gap', () => {
		const win = activeSeasonWindow(
			recipe(range(4, 1, 4, 30), range(6, 1, 6, 30)),
			new Date(2026, 3, 15)
		);
		expect(win!.lengthDays).toBe(30);
	});

	it('carries a window across the year boundary', () => {
		// Dec 25 → Jan 6, seen from January: the window opened last year.
		const win = activeSeasonWindow(recipe(range(12, 25, 1, 6)), new Date(2026, 0, 2));
		expect(win!.lengthDays).toBe(13);
		expect(win!.daysLeft).toBe(4);
		expect(win!.start.getFullYear()).toBe(2025);
	});

	it('ranks a narrow window ahead of a broad one', () => {
		const today = new Date(2026, 6, 15);
		const fleeting = activeSeasonWindow(recipe(range(7, 14, 7, 16)), today)!;
		const broad = activeSeasonWindow(recipe(range(4, 1, 10, 31)), today)!;
		expect(fleeting.lengthDays).toBeLessThan(broad.lengthDays);
	});
});
