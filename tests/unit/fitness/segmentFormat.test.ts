import { describe, it, expect } from 'vitest';
import { formatElapsed, formatMinSec, formatPaceKm, formatSegmentDate, segmentLocale } from '$lib/fitness/segmentFormat';
import { formatPaceValue } from '$lib/data/cardioPrRanges';
import { formatPaceAxis } from '$lib/fitness/gpsSeries';
import { localDateStr } from '$lib/js/localDate';

describe('formatSegmentDate', () => {
	// The three segment pages each had this exact formatter inline.
	const inline = (d: string | Date, locale: string) =>
		new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

	it('matches the old inline formatter for both languages', () => {
		for (const lang of ['en', 'de']) {
			const locale = segmentLocale(lang);
			for (const d of ['2026-03-05T08:00:00.000Z', new Date(2025, 11, 31, 23, 30)]) {
				expect(formatSegmentDate(d, locale)).toBe(inline(d, locale));
			}
		}
	});

	it('picks de-CH for German and en-GB otherwise', () => {
		expect(segmentLocale('de')).toBe('de-CH');
		expect(segmentLocale('en')).toBe('en-GB');
		expect(formatSegmentDate('2026-03-05T12:00:00Z', 'en-GB')).toBe('5 Mar 2026');
	});
});

describe('formatElapsed (formerly also runCardData formatClock)', () => {
	const formatClock = (totalSec: number) => {
		const s = Math.max(0, Math.round(totalSec));
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		const pad = (n: number) => n.toString().padStart(2, '0');
		return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
	};

	it('gives the same string as the share card clock', () => {
		for (const s of [-5, 0, 0.4, 0.5, 59.5, 61, 599, 3599.6, 3600, 3661, 36000, 86399]) {
			expect(formatElapsed(s)).toBe(formatClock(s));
		}
		expect(formatElapsed(3661)).toBe('1:01:01');
		expect(formatElapsed(59.5)).toBe('1:00');
	});
});

describe('localDateStr (formerly also PeriodTracker fmtLocal)', () => {
	const fmtLocal = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	it('gives the same local day key', () => {
		for (const d of [new Date(2026, 0, 1), new Date(2026, 11, 31, 23, 59), new Date(2024, 1, 29, 0, 0, 1)]) {
			expect(localDateStr(d)).toBe(fmtLocal(d));
		}
	});
});

describe('pace and minute formatting', () => {
	it('rounds to whole seconds before splitting, so a minute never shows :60', () => {
		// 4.9999 min is 299.994 s: the old per-part rounding printed 4:60
		expect(formatMinSec(4.9999)).toBe('5:00');
		expect(formatPaceKm(5.9995)).toBe('6:00 /km');
		expect(formatPaceValue(3.99999)).toBe('4:00 min/km');
		expect(formatPaceAxis(7.9999)).toBe('8:00');
	});

	it('keeps ordinary values and uncapped minutes', () => {
		expect(formatMinSec(5.5)).toBe('5:30');
		expect(formatMinSec(0.25)).toBe('0:15');
		expect(formatMinSec(75.5)).toBe('75:30');
		expect(formatPaceKm(4.25)).toBe('4:15 /km');
		expect(formatPaceValue(5.1)).toBe('5:06 min/km');
	});

	it('shows a dash for a pace that is missing or not positive', () => {
		for (const v of [null, undefined, 0, -1, Infinity, NaN]) expect(formatPaceKm(v)).toBe('—');
	});
});
