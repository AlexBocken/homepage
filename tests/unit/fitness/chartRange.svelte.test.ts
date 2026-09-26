import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import {
	DAY_MS,
	dayStamp,
	enumerateDays,
	trailingDaysRange,
	createZoomRange,
	type XRange
} from '$lib/fitness/chartRange.svelte';

describe('enumerateDays', () => {
	it('is inclusive of both ends', () => {
		expect(enumerateDays('2026-01-30', '2026-02-02')).toEqual([
			'2026-01-30',
			'2026-01-31',
			'2026-02-01',
			'2026-02-02'
		]);
		expect(enumerateDays('2026-05-05', '2026-05-05')).toEqual(['2026-05-05']);
	});

	it('handles month ends and leap years', () => {
		expect(enumerateDays('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
		expect(enumerateDays('2026-02-28', '2026-03-01')).toEqual(['2026-02-28', '2026-03-01']);
		expect(enumerateDays('2025-12-31', '2026-01-01')).toEqual(['2025-12-31', '2026-01-01']);
		expect(enumerateDays('2026-04-30', '2026-05-01')).toEqual(['2026-04-30', '2026-05-01']);
	});

	it('neither drops nor repeats a day across DST changes', () => {
		const prevTz = process.env.TZ;
		process.env.TZ = 'Europe/Zurich';
		try {
			// spring forward (29 Mar 2026) and fall back (25 Oct 2026)
			expect(enumerateDays('2026-03-28', '2026-03-30')).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
			expect(enumerateDays('2026-10-24', '2026-10-26')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
			const year = enumerateDays('2026-01-01', '2026-12-31');
			expect(year).toHaveLength(365);
			expect(new Set(year).size).toBe(365);
		} finally {
			if (prevTz === undefined) delete process.env.TZ;
			else process.env.TZ = prevTz;
		}
	});

	it('is empty for missing bounds or a reversed range', () => {
		expect(enumerateDays('', '2026-01-01')).toEqual([]);
		expect(enumerateDays('2026-01-01', '')).toEqual([]);
		expect(enumerateDays(null, undefined)).toEqual([]);
		expect(enumerateDays('2026-01-02', '2026-01-01')).toEqual([]);
	});
});

describe('trailingDaysRange', () => {
	it('spans the last N days ending on the last date', () => {
		const days = enumerateDays('2026-01-01', '2026-03-31');
		expect(trailingDaysRange(days, 30)).toEqual({
			min: dayStamp('2026-03-02'),
			max: dayStamp('2026-03-31')
		});
	});

	it('is clipped to the first date and null when empty', () => {
		const days = enumerateDays('2026-03-20', '2026-03-31');
		expect(trailingDaysRange(days, 30)).toEqual({ min: dayStamp('2026-03-20'), max: dayStamp('2026-03-31') });
		expect(trailingDaysRange([], 30)).toBeNull();
		expect(dayStamp('2026-01-02') - dayStamp('2026-01-01')).toBe(DAY_MS);
	});
});

describe('createZoomRange', () => {
	let cleanup: (() => void) | undefined;
	afterEach(() => cleanup?.());

	it('follows the default until a gesture, holds that until reset', () => {
		let def = $state<XRange | null>({ min: 0, max: 10 });
		let zoom!: ReturnType<typeof createZoomRange>;
		cleanup = $effect.root(() => {
			zoom = createZoomRange(() => def);
		});

		expect(zoom.xRange).toEqual({ min: 0, max: 10 });
		expect(zoom.isZoomed).toBe(false);

		def = { min: 5, max: 15 };
		flushSync();
		expect(zoom.xRange).toEqual({ min: 5, max: 15 });

		const r = { min: 2, max: 3 };
		zoom.onRange(r);
		r.min = 99; // a copy is kept, not the chart's own object
		expect(zoom.xRange).toEqual({ min: 2, max: 3 });
		expect(zoom.isZoomed).toBe(true);

		def = { min: 7, max: 8 };
		expect(zoom.xRange).toEqual({ min: 2, max: 3 });

		zoom.reset();
		expect(zoom.xRange).toEqual({ min: 7, max: 8 });
		expect(zoom.isZoomed).toBe(false);
	});

	it('is null while there is no default', () => {
		cleanup = $effect.root(() => {
			const zoom = createZoomRange(() => null);
			expect(zoom.xRange).toBeNull();
		});
	});
});
