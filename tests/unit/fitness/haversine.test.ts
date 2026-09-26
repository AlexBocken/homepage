import { describe, it, expect } from 'vitest';
import { haversineKm, trackDistance as gpxTrackDistance } from '$lib/gpx';
import { haversine, trackDistance } from '$lib/fitness/gpsSeries.js';

/**
 * Reference copy of the haversine that used to live, character for character,
 * in `$lib/gpx`, `$lib/fitness/gpsSeries.js` and the session snap endpoint.
 * The three copies were folded into `$lib/gpx`; this pins that every caller
 * still gets bit-identical numbers (segment matching compares distances against
 * thresholds, so even a last-ulp drift could flip a match).
 */
function referenceHaversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

const P = [
	{ lat: 47.3769, lng: 8.5417, timestamp: 0 },
	{ lat: 46.948, lng: 7.4474, timestamp: 0 },
	{ lat: 51.5074, lng: -0.1278, timestamp: 0 },
	{ lat: -33.8688, lng: 151.2093, timestamp: 0 },
	{ lat: -33.86881, lng: 151.20931, timestamp: 0 },
	{ lat: 0, lng: 179.9999, timestamp: 0 },
	{ lat: 0, lng: -179.9999, timestamp: 0 }
];

describe('haversine', () => {
	it('matches the reference formula bit for bit', () => {
		for (let i = 1; i < P.length; i++) {
			const ref = referenceHaversine(P[i - 1], P[i]);
			expect(haversineKm(P[i - 1], P[i])).toBe(ref);
			expect(haversine(P[i - 1], P[i])).toBe(ref);
		}
	});

	it('gives known great-circle distances', () => {
		expect(haversineKm(P[0], P[1])).toBeCloseTo(95.5, 0); // Zurich - Bern
		expect(haversineKm(P[0], P[0])).toBe(0);
		// across the antimeridian is the short way round
		expect(haversineKm(P[5], P[6])).toBeCloseTo(0.0222, 3);
	});

	it('trackDistance sums consecutive legs identically in both modules', () => {
		let ref = 0;
		for (let i = 1; i < P.length; i++) ref += referenceHaversine(P[i - 1], P[i]);
		expect(gpxTrackDistance(P)).toBe(ref);
		expect(trackDistance(P)).toBe(ref);
		expect(trackDistance([])).toBe(0);
		expect(trackDistance([P[0]])).toBe(0);
	});

	it('accepts bare lat/lng points (no timestamp)', () => {
		const a = { lat: 1, lng: 2 };
		const b = { lat: 1.001, lng: 2.001 };
		expect(haversineKm(a, b)).toBe(referenceHaversine(a, b));
	});
});
