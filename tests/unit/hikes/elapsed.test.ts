import { describe, it, expect } from 'vitest';
import { formatDuration, photoElapsed } from '../../../src/lib/hikes/elapsed';
import type { HikeStage, HikeTrackPoint } from '../../../src/types/hikes';

const MIN = 60_000;
const H = 60 * MIN;

function stage(startIdx: number, endIdx: number): HikeStage {
	return {
		name: `Etappe ${startIdx}`,
		startIdx,
		endIdx,
		distanceKm: 1,
		durationMin: null,
		elevationGainM: 0,
		elevationLossM: 0,
		elevationMaxM: null,
		elevationMinM: null
	};
}

// Day 1 runs 14:30–18:00, day 2 08:00–16:00, day 3 07:00–12:00 (hours from t=0).
const at = (h: number): HikeTrackPoint => [46, 12, 1000, h * H];
const track: HikeTrackPoint[] = [at(14.5), at(18), at(32), at(40), at(55), at(60)];
const stages = [stage(0, 1), stage(2, 3), stage(4, 5)];

describe('formatDuration', () => {
	it('shows minutes, then hours', () => {
		expect(formatDuration(42 * MIN)).toBe('42 min');
		expect(formatDuration(2 * H)).toBe('2 h');
		expect(formatDuration(2 * H + 5 * MIN)).toBe('2 h 5 min');
		expect(formatDuration(-1)).toBeNull();
	});
});

describe('photoElapsed', () => {
	it('counts a day hike from the first track point', () => {
		expect(photoElapsed(16.5 * H, track, null)).toBe('2 h');
		expect(photoElapsed(16.5 * H, track, [stage(0, 5)])).toBe('2 h');
	});

	it('counts days by stage and the time within that day', () => {
		expect(photoElapsed(16 * H, track, stages)).toBe('1 h 30 min');
		expect(photoElapsed(33.5 * H + 4 * MIN, track, stages)).toBe('1 d 1 h 34 min');
		expect(photoElapsed(61 * H, track, stages)).toBe('2 d 6 h');
	});

	it('gives a photo before the morning departure the day alone, not the night', () => {
		// 07:39 on day 2 — nearer the 08:00 start than the previous 18:00 arrival.
		expect(photoElapsed(31.65 * H, track, stages)).toBe('1 d');
	});

	it('keeps an evening photo at camp on the day it was walked', () => {
		expect(photoElapsed(18.7 * H, track, stages)).toBe('4 h 12 min');
	});

	it('says nothing without a timestamp or track', () => {
		expect(photoElapsed(undefined, track, stages)).toBeNull();
		expect(photoElapsed(H, null, stages)).toBeNull();
		expect(photoElapsed(H, [[46, 12]], null)).toBeNull();
	});
});
