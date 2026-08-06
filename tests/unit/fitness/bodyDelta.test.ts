import { describe, it, expect } from 'vitest';
import { sampleAt, weightDelta, bodyFatDelta } from '../../../src/lib/fitness/bodyDelta';

/**
 * The change tiles beside the dashboard's body charts. What matters here is that
 * a reference date resolves to a reading that actually exists, that the number
 * is read off the trend rather than a single noisy weigh-in, and that the kg
 * body-fat reading is fat *mass* (weight × body-fat fraction) rather than a
 * percentage dressed up in kilos.
 */

const ms = (d: string) => new Date(d).getTime();

const WEIGHT = {
	dates: ['2026-07-01T08:00:00.000Z', '2026-07-08T08:00:00.000Z', '2026-07-15T08:00:00.000Z'],
	data: [80, 78.4, 79.1],
	sma: [80, 79, 78]
};

describe('sampleAt', () => {
	it('takes the last reading at or before the target', () => {
		expect(sampleAt(WEIGHT, ms('2026-07-10T00:00:00.000Z'))).toEqual({
			value: 79,
			date: '2026-07-08T08:00:00.000Z'
		});
	});

	it('falls back to the first reading when the target predates the series', () => {
		expect(sampleAt(WEIGHT, ms('2026-01-01T00:00:00.000Z'))?.date).toBe('2026-07-01T08:00:00.000Z');
	});

	it('prefers the trend over the raw readings', () => {
		expect(sampleAt(WEIGHT, Infinity)?.value).toBe(78);
	});

	it('uses the raw readings when there is no trend', () => {
		expect(sampleAt({ ...WEIGHT, sma: [null, null, null] }, Infinity)?.value).toBe(79.1);
	});

	it('returns null for an empty series', () => {
		expect(sampleAt({}, Infinity)).toBeNull();
	});
});

describe('weightDelta', () => {
	it('is negative when weight came off', () => {
		const d = weightDelta(WEIGHT, ms('2026-07-08T23:59:59.000Z'));
		expect(d?.delta).toBeCloseTo(-1, 6);
		expect(d?.from).toBe('2026-07-08T08:00:00.000Z');
		expect(d?.to).toBe('2026-07-15T08:00:00.000Z');
	});

	it('is null with a single reading — one weigh-in is not a change', () => {
		expect(weightDelta({ dates: [WEIGHT.dates[0]], data: [80], sma: [80] }, 0)).toBeNull();
	});
});

describe('bodyFatDelta', () => {
	// Stored as Δ percentage points from the baseline, the way the overview
	// endpoint builds it: 20% → 19% over the same two weeks.
	const BF = {
		dates: WEIGHT.dates,
		data: [0, -0.4, -1],
		sma: [0, -0.5, -1],
		baseline: 20
	};

	it('reads percentage points straight off the trend', () => {
		const d = bodyFatDelta(BF, WEIGHT, ms('2026-07-01T23:59:59.000Z'), 'pp');
		expect(d?.delta).toBeCloseTo(-1, 6);
	});

	it('reads kg as fat mass, so a lighter body at the same percentage still loses fat', () => {
		// 80 kg @ 20% = 16.0 kg fat → 78 kg @ 19% = 14.82 kg fat
		const d = bodyFatDelta(BF, WEIGHT, ms('2026-07-01T23:59:59.000Z'), 'kg');
		expect(d?.delta).toBeCloseTo(-1.18, 6);
	});

	it('is null in kg mode without weight readings to pair against', () => {
		expect(bodyFatDelta(BF, {}, 0, 'kg')).toBeNull();
	});
});

/**
 * The tiles used to be fed the dashboard's charts, which are a fixed 14-day
 * window. A reference date older than that had no reading to land on, so
 * `sampleAt` fell back to the window's first point and the tile reported the
 * last fortnight while labelling it with whatever date had been picked. The API
 * now sends a separate full-history series; these lock in the difference.
 */
describe('a reference date older than the charted window', () => {
	// Six months of weight, trending 90 → 80.
	const FULL = {
		dates: [
			'2026-01-15T08:00:00.000Z',
			'2026-03-15T08:00:00.000Z',
			'2026-06-15T08:00:00.000Z',
			'2026-07-01T08:00:00.000Z',
			'2026-07-15T08:00:00.000Z'
		],
		sma: [90, 87, 83, 81, 80]
	};
	// What the 14-day chart carries: only the tail.
	const WINDOWED = {
		dates: ['2026-07-01T08:00:00.000Z', '2026-07-15T08:00:00.000Z'],
		sma: [81, 80]
	};

	it('reaches the actual starting day', () => {
		const d = weightDelta(FULL, ms('2026-01-15T23:59:59'))!;
		expect(d.delta).toBeCloseTo(-10); // 90 → 80
		expect(d.from).toBe('2026-01-15T08:00:00.000Z');
	});

	it('is the number the windowed series could not produce', () => {
		const clamped = weightDelta(WINDOWED, ms('2026-01-15T23:59:59'))!;
		// Falls back to the window's first point: reports -1 kg, not -10.
		expect(clamped.delta).toBeCloseTo(-1);
		expect(clamped.from).toBe('2026-07-01T08:00:00.000Z');
	});

	it('still reports the reading it compared against, not the date asked for', () => {
		// Nothing logged on 20 February; the tile measures from 15 January.
		const d = weightDelta(FULL, ms('2026-02-20T23:59:59'))!;
		expect(d.from).toBe('2026-01-15T08:00:00.000Z');
		expect(d.delta).toBeCloseTo(-10);
	});

	// The full-history body-fat series is absolute with baseline 0, where the
	// chart's is a delta from its own first shown point.
	it('reads fat mass off an absolute body-fat series', () => {
		const bf = {
			dates: ['2026-01-15T08:00:00.000Z', '2026-07-15T08:00:00.000Z'],
			sma: [25, 20],
			baseline: 0
		};
		const weight = {
			dates: ['2026-01-15T08:00:00.000Z', '2026-07-15T08:00:00.000Z'],
			sma: [90, 80]
		};
		const d = bodyFatDelta(bf, weight, ms('2026-01-15T23:59:59'), 'kg')!;
		// 90 × 25% = 22.5 kg of fat, down to 80 × 20% = 16 kg.
		expect(d.delta).toBeCloseTo(-6.5);
	});
});
