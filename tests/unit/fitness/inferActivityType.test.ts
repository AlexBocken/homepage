import { describe, it, expect } from 'vitest';
import { inferActivityType } from '$lib/server/bestEffortsBackfill';

const PT = { lat: 47, lng: 8, timestamp: 0 };

describe('inferActivityType', () => {
	it('leaves a stored activityType alone', () => {
		expect(
			inferActivityType({
				activityType: 'cycling',
				exercises: [{ exerciseId: 'running', gpsTrack: [PT, PT] }]
			})
		).toBeNull();
	});

	it('reads the activity off the cardio exercise carrying the track', () => {
		expect(inferActivityType({ exercises: [{ exerciseId: 'running', gpsTrack: [PT, PT] }] })).toBe(
			'running'
		);
		expect(
			inferActivityType({ exercises: [{ exerciseId: 'cycling-outdoor', gpsTrack: [PT, PT] }] })
		).toBe('cycling');
		expect(inferActivityType({ exercises: [{ exerciseId: 'hiking', gpsTrack: [PT, PT] }] })).toBe(
			'hiking'
		);
	});

	it('prefers the exercise with the track over one merely logged alongside it', () => {
		expect(
			inferActivityType({
				exercises: [
					{ exerciseId: 'cycling-indoor' },
					{ exerciseId: 'running', gpsTrack: [PT, PT] }
				]
			})
		).toBe('running');
	});

	it('still infers from a trackless cardio exercise when nothing carries a track', () => {
		expect(inferActivityType({ exercises: [{ exerciseId: 'walking' }] })).toBe('walking');
	});

	it('files a GPS-mode workout with only a top-level track under running', () => {
		expect(inferActivityType({ mode: 'gps', gpsTrack: [PT, PT] })).toBe('running');
	});

	it('says nothing about activities that have no best-effort board', () => {
		expect(
			inferActivityType({ exercises: [{ exerciseId: 'swimming', gpsTrack: [PT, PT] }] })
		).toBeNull();
		expect(
			inferActivityType({ exercises: [{ exerciseId: 'rowing-outdoor', gpsTrack: [PT, PT] }] })
		).toBeNull();
	});

	it('says nothing about a strength session', () => {
		expect(
			inferActivityType({ mode: 'manual', exercises: [{ exerciseId: 'bench-press-barbell' }] })
		).toBeNull();
	});
});
