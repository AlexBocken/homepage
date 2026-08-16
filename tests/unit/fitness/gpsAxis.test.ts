import { describe, it, expect } from 'vitest';
import { fitYAxis, formatPaceAxis, GPS_Y_AXIS } from '$lib/fitness/gpsSeries.js';

/** The tick values an axis will draw, so a test can assert on the labels. */
function ticks(axis: { min: number; max: number; stepSize: number }) {
	const out: number[] = [];
	for (let i = 0; axis.min + i * axis.stepSize <= axis.max + 1e-9; i++) {
		out.push(axis.min + i * axis.stepSize);
	}
	return out;
}

describe('formatPaceAxis', () => {
	it('reads a pace as minutes and seconds', () => {
		expect(formatPaceAxis(6.25)).toBe('6:15');
		expect(formatPaceAxis(6)).toBe('6:00');
		expect(formatPaceAxis(4.5)).toBe('4:30');
	});

	it('rounds to the nearest second rather than truncating', () => {
		expect(formatPaceAxis(5.99999)).toBe('6:00');
	});
});

describe('fitYAxis', () => {
	it('holds a minimum span open, so GPS noise is not magnified', () => {
		// A metronome-steady run: the whole series lives inside a hundredth of a
		// second per km. Fitted to its own extent, that noise would fill the chart.
		const flat = Array.from({ length: 50 }, (_, i) => 6.108 + (i % 3) * 0.00005);
		const axis = fitYAxis(flat, GPS_Y_AXIS.pace)!;
		expect(axis.max - axis.min).toBeGreaterThanOrEqual(GPS_Y_AXIS.pace.minSpan);
		expect(ticks(axis).map(formatPaceAxis)).toEqual(['5:30', '5:45', '6:00', '6:15', '6:30', '6:45']);
	});

	it('follows the data once it varies by more than the minimum span', () => {
		const axis = fitYAxis([4.5, 5.2, 6.8, 5, 7.4], GPS_Y_AXIS.pace)!;
		expect(axis.min).toBeLessThanOrEqual(4.5);
		expect(axis.max).toBeGreaterThanOrEqual(7.4);
		expect(ticks(axis).map(formatPaceAxis)).toEqual(['4:00', '5:00', '6:00', '7:00', '8:00']);
	});

	it('puts every pace gridline on a whole number of seconds', () => {
		for (const span of [0.4, 1.2, 3, 7, 20]) {
			const axis = fitYAxis([5, 5 + span], GPS_Y_AXIS.pace)!;
			for (const v of ticks(axis)) expect(Math.abs(v * 60 - Math.round(v * 60))).toBeLessThan(1e-6);
		}
	});

	it('never opens a pace or cadence axis below zero', () => {
		expect(fitYAxis([0.2, 0.3], GPS_Y_AXIS.pace)!.min).toBe(0);
		const cadence = fitYAxis([3, 6], GPS_Y_AXIS.cadence)!;
		expect(cadence.min).toBe(0);
		// Clamping shifts the window up instead of shrinking it below the minimum.
		expect(cadence.max - cadence.min).toBeGreaterThanOrEqual(GPS_Y_AXIS.cadence.minSpan);
	});

	it('draws a flat route flat and a hilly one to scale', () => {
		expect(fitYAxis([412, 413, 411, 412], GPS_Y_AXIS.elevation)).toEqual({ min: 380, max: 440, stepSize: 10 });
		expect(fitYAxis([400, 900, 1250, 600], GPS_Y_AXIS.elevation)).toEqual({ min: 400, max: 1400, stepSize: 200 });
	});

	it('keeps the gridline count readable on a short chart', () => {
		for (const cfg of [GPS_Y_AXIS.pace, GPS_Y_AXIS.elevation, GPS_Y_AXIS.cadence]) {
			for (const [lo, hi] of [[0, 1], [10, 11], [100, 3000], [5, 5]]) {
				const axis = fitYAxis([lo, hi], cfg)!;
				expect(ticks(axis).length).toBeLessThanOrEqual(7);
				expect(ticks(axis).length).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it('has no axis to draw when the series is empty', () => {
		expect(fitYAxis([null, null], GPS_Y_AXIS.cadence)).toBeUndefined();
		expect(fitYAxis([], GPS_Y_AXIS.pace)).toBeUndefined();
	});
});
