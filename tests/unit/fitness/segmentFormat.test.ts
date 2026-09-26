import { describe, it, expect } from 'vitest';
import { formatElapsed, formatSegmentDate, segmentLocale } from '$lib/fitness/segmentFormat';
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
