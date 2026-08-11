import { describe, it, expect } from 'vitest';
import { sampleProfileAtDistances } from '../../../src/lib/server/hikesRouting';

// Swisstopo's profile.json answers with the vertices it was given *and* its own
// evenly spaced samples in between — ask for 3 points on an uneven line and 4
// come back. Reading them off by index therefore hands each vertex a height
// from somewhere further along, and the drift grows with every extra sample.
// These cover the matching that replaced it.
describe('sampleProfileAtDistances', () => {
	it('gives each vertex its own sample despite interpolated extras', () => {
		// Vertices at 0, 20 and 2000 m; the service inserted one at 1010 m.
		const profile = [
			{ dist: 0, alt: 519.5 },
			{ dist: 20, alt: 521.3 },
			{ dist: 1010, alt: 523.4 },
			{ dist: 2000, alt: 479.2 }
		];
		expect(sampleProfileAtDistances(profile, [0, 20, 2000])).toEqual([519.5, 521.3, 479.2]);
	});

	it('returns the same height for the same distance, however often it recurs', () => {
		// A lapped route asks for the same arc lengths twice. Whatever else is
		// true, one place must not come back with two altitudes.
		const profile = [
			{ dist: 0, alt: 430 },
			{ dist: 500, alt: 445 },
			{ dist: 1000, alt: 430 }
		];
		const [a, b] = sampleProfileAtDistances(profile, [250, 250]);
		expect(a).toBe(b);
	});

	it('interpolates between samples', () => {
		const profile = [
			{ dist: 0, alt: 400 },
			{ dist: 100, alt: 500 }
		];
		expect(sampleProfileAtDistances(profile, [25, 50, 75])).toEqual([425, 450, 475]);
	});

	it('clamps past either end rather than extrapolating', () => {
		const profile = [
			{ dist: 10, alt: 400 },
			{ dist: 20, alt: 410 }
		];
		expect(sampleProfileAtDistances(profile, [0, 30])).toEqual([400, 410]);
	});

	it('skips holes in the model instead of reading them as sea level', () => {
		const profile = [
			{ dist: 0, alt: 400 },
			{ dist: 50, alt: null },
			{ dist: 100, alt: 500 }
		];
		expect(sampleProfileAtDistances(profile, [50])).toEqual([450]);
	});

	it('has nothing to say when the profile is empty', () => {
		expect(sampleProfileAtDistances([], [0, 10])).toEqual([null, null]);
		expect(sampleProfileAtDistances([{ dist: 0, alt: null }], [5])).toEqual([null]);
	});

	it('holds a single usable sample across every distance', () => {
		expect(sampleProfileAtDistances([{ dist: 0, alt: 442 }], [0, 100])).toEqual([442, 442]);
	});
});
