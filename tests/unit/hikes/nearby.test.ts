import { describe, it, expect } from 'vitest';
import { crowFliesKm, nearbyHikes } from '../../../src/lib/hikes/nearby';
import type { HikeManifestEntry } from '../../../src/types/hikes';

const hike = (slug: string, centroid: [number, number], hidden = false) =>
	({ slug, centroid, hidden }) as unknown as HikeManifestEntry;

// Rough real-world anchors: Amden, Flumserberg, Flims, Millstatt (AT).
const AMDEN: [number, number] = [47.15, 9.15];
const FLUMSERBERG: [number, number] = [47.09, 9.27];
const FLIMS: [number, number] = [46.83, 9.28];
const MILLSTATT: [number, number] = [46.8, 13.58];

describe('crowFliesKm', () => {
	it('is zero for the same point and symmetric', () => {
		expect(crowFliesKm(AMDEN, AMDEN)).toBe(0);
		expect(crowFliesKm(AMDEN, FLIMS)).toBeCloseTo(crowFliesKm(FLIMS, AMDEN), 6);
	});

	it('gets Amden–Flumserberg roughly right', () => {
		const d = crowFliesKm(AMDEN, FLUMSERBERG);
		expect(d).toBeGreaterThan(10);
		expect(d).toBeLessThan(13);
	});
});

describe('nearbyHikes', () => {
	const all = [hike('amden', AMDEN), hike('flums', FLUMSERBERG), hike('flims', FLIMS), hike('millstatt', MILLSTATT), hike('secret', AMDEN, true)];

	it('returns the nearest within the radius, nearest first, never itself or hidden hikes', () => {
		const out = nearbyHikes(all, 'amden');
		expect(out.map((n) => n.hike.slug)).toEqual(['flums', 'flims']);
		expect(out[0].distanceKm).toBeLessThan(out[1].distanceKm);
	});

	it('gives a hike with nothing inside the radius no neighbours', () => {
		expect(nearbyHikes(all, 'millstatt')).toEqual([]);
		expect(nearbyHikes(all, 'millstatt', { radiusKm: 1000 }).map((n) => n.hike.slug)).toEqual(['flims', 'flums', 'amden']);
	});

	it('caps the count', () => {
		expect(nearbyHikes(all, 'amden', { radiusKm: 1000, max: 1 })).toHaveLength(1);
	});

	it('is empty for an unknown slug', () => {
		expect(nearbyHikes(all, 'nope')).toEqual([]);
	});
});
