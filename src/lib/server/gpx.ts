/**
 * Shared GPX helpers used by the fitness API and the hikes build pipeline.
 * Kept dependency-free so the same module is callable from server routes,
 * vite-node build scripts, and (where useful) the browser.
 */

export interface GpxPoint {
	lat: number;
	lng: number;
	altitude?: number;
	timestamp: number;
}

/** Haversine distance in km between two points. */
export function haversine(a: GpxPoint, b: GpxPoint): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) *
			Math.cos((b.lat * Math.PI) / 180) *
			sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Sum of consecutive haversine distances in km. */
export function trackDistance(track: GpxPoint[]): number {
	let total = 0;
	for (let i = 1; i < track.length; i++) {
		total += haversine(track[i - 1], track[i]);
	}
	return total;
}

/**
 * Parse a GPX XML string into an array of GpxPoints.
 * Extracts `<trkpt>`/`<rtept>` with optional `<ele>` and `<time>`.
 * Falls back to `Date.now()` when no timestamp is present so downstream
 * consumers always have a numeric `timestamp` field.
 */
export function parseGpx(xml: string): GpxPoint[] {
	const points: GpxPoint[] = [];
	const trkptRegex = /<(?:trkpt|rtept)\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
	let match;
	while ((match = trkptRegex.exec(xml)) !== null) {
		const lat = parseFloat(match[1]);
		const lng = parseFloat(match[2]);
		const body = match[3];

		let altitude: number | undefined;
		const eleMatch = body.match(/<ele>([^<]+)<\/ele>/);
		if (eleMatch) altitude = parseFloat(eleMatch[1]);

		let timestamp = Date.now();
		const timeMatch = body.match(/<time>([^<]+)<\/time>/);
		if (timeMatch) timestamp = new Date(timeMatch[1]).getTime();

		if (!isNaN(lat) && !isNaN(lng)) {
			points.push({ lat, lng, altitude, timestamp });
		}
	}
	return points;
}

export interface GpxImageRef {
	hash: string;
	name?: string;
	lat: number;
	lng: number;
	altitude?: number;
	timestamp?: number;
	visibility?: 'public' | 'private';
}

/**
 * Parse standalone `<wpt>` waypoints that carry a `<bocken:image hash="…"/>`
 * extension. Returned as a hash → ref map so the build script can look up an
 * image's corrected position by content hash. Waypoints without the image
 * extension are ignored.
 */
export function parseGpxImageRefs(xml: string): Record<string, GpxImageRef> {
	const out: Record<string, GpxImageRef> = {};
	const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/gi;
	let match;
	while ((match = wptRegex.exec(xml)) !== null) {
		const lat = parseFloat(match[1]);
		const lng = parseFloat(match[2]);
		const body = match[3];
		// Accept either namespaced (`bocken:image`) or bare (`image`) tags so
		// the parser tolerates GPX files produced by other tooling that may
		// drop our custom namespace prefix.
		const imageMatch = body.match(/<(?:[A-Za-z]+:)?image\s+([^/>]*?)\/?>/i);
		if (!imageMatch) continue;
		const attrs = imageMatch[1];
		const hashAttr = attrs.match(/\bhash="([^"]+)"/i);
		if (!hashAttr) continue;
		const hash = hashAttr[1];
		const visibilityAttr = attrs.match(/\bvisibility="([^"]+)"/i);
		const visibility: 'public' | 'private' =
			visibilityAttr && visibilityAttr[1].toLowerCase() === 'private' ? 'private' : 'public';
		const nameMatch = body.match(/<name>([^<]+)<\/name>/);
		const eleMatch = body.match(/<ele>([^<]+)<\/ele>/);
		const timeMatch = body.match(/<time>([^<]+)<\/time>/);
		if (isNaN(lat) || isNaN(lng)) continue;
		out[hash] = {
			hash,
			name: nameMatch ? nameMatch[1].trim() : undefined,
			lat,
			lng,
			altitude: eleMatch ? parseFloat(eleMatch[1]) : undefined,
			timestamp: timeMatch ? new Date(timeMatch[1]).getTime() : undefined,
			visibility
		};
	}
	return out;
}
