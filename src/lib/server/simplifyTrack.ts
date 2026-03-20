/**
 * Ramer-Douglas-Peucker line simplification.
 * Reduces a GPS track to a visually faithful preview with far fewer points.
 * Preserves curves and corners, drops redundant points on straights.
 */

interface Point {
	lat: number;
	lng: number;
}

/** Perpendicular distance from point P to line segment A-B (in degrees, good enough for simplification) */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
	const dx = b.lng - a.lng;
	const dy = b.lat - a.lat;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		// A and B are the same point
		const ex = p.lng - a.lng;
		const ey = p.lat - a.lat;
		return Math.sqrt(ex * ex + ey * ey);
	}
	const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
	const projLng = a.lng + t * dx;
	const projLat = a.lat + t * dy;
	const ex = p.lng - projLng;
	const ey = p.lat - projLat;
	return Math.sqrt(ex * ex + ey * ey);
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
	if (points.length <= 2) return points;

	let maxDist = 0;
	let maxIdx = 0;
	const first = points[0];
	const last = points[points.length - 1];

	for (let i = 1; i < points.length - 1; i++) {
		const d = perpendicularDistance(points[i], first, last);
		if (d > maxDist) {
			maxDist = d;
			maxIdx = i;
		}
	}

	if (maxDist > epsilon) {
		const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
		const right = rdpSimplify(points.slice(maxIdx), epsilon);
		return [...left.slice(0, -1), ...right];
	}

	return [first, last];
}

/**
 * Simplify a GPS track to a preview polyline.
 * @param track - Full track with lat/lng fields
 * @param maxPoints - Target maximum number of points (default 30)
 * @returns Array of [lat, lng] pairs
 */
export function simplifyTrack(track: Array<{ lat: number; lng: number }>, maxPoints = 30): number[][] {
	if (track.length <= maxPoints) {
		return track.map(p => [p.lat, p.lng]);
	}

	// Start with a generous epsilon, tighten until we're under maxPoints
	// Estimate initial epsilon from bounding box
	let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
	for (const p of track) {
		if (p.lat < minLat) minLat = p.lat;
		if (p.lat > maxLat) maxLat = p.lat;
		if (p.lng < minLng) minLng = p.lng;
		if (p.lng > maxLng) maxLng = p.lng;
	}
	const extent = Math.max(maxLat - minLat, maxLng - minLng);

	// Binary search for the right epsilon
	let lo = 0;
	let hi = extent * 0.1;
	let result = rdpSimplify(track, hi);

	// If even max epsilon gives too many points, increase hi
	while (result.length > maxPoints && hi < extent) {
		hi *= 2;
		result = rdpSimplify(track, hi);
	}

	// Binary search between lo and hi
	for (let iter = 0; iter < 20; iter++) {
		const mid = (lo + hi) / 2;
		result = rdpSimplify(track, mid);
		if (result.length > maxPoints) {
			lo = mid;
		} else {
			hi = mid;
		}
		// Close enough
		if (result.length >= maxPoints - 5 && result.length <= maxPoints) break;
	}

	return result.map(p => [p.lat, p.lng]);
}
