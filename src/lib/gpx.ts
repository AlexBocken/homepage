/**
 * Pure GPX serializer usable from both server scripts and the browser.
 * Kept dependency-free so the route-builder can bundle it for client-side
 * GPX export without dragging in Node-only helpers.
 */

// ---------------------------------------------------------------------------
// GPX parsing (pure, regex-based — no DOM / no XML library, so usable in
// build scripts, server endpoints, and the browser alike).
// ---------------------------------------------------------------------------

export interface GpxPoint {
	lat: number;
	lng: number;
	altitude?: number;
	timestamp: number;
}

/** Haversine distance in km between two GpxPoints. */
export function haversineKm(a: GpxPoint, b: GpxPoint): number {
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
		total += haversineKm(track[i - 1], track[i]);
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

export interface GpxStage {
	/** `<name>` of the `<trk>`, or null when absent. */
	name: string | null;
	points: GpxPoint[];
}

/**
 * Parse a GPX into one stage per `<trk>` element (a multi-day route ships its
 * stages as separate named tracks). Each stage keeps its own ordered points;
 * concatenating them yields the same flat list `parseGpx` returns.
 *
 * Falls back to a single unnamed stage covering the whole document when there
 * are no `<trk>` wrappers (e.g. an `<rtept>`-only route).
 */
export function parseGpxStages(xml: string): GpxStage[] {
	const stages: GpxStage[] = [];
	const trkRegex = /<trk>([\s\S]*?)<\/trk>/gi;
	let match;
	while ((match = trkRegex.exec(xml)) !== null) {
		const body = match[1];
		const nameMatch = body.match(/<name>([^<]*)<\/name>/i);
		const name = nameMatch ? nameMatch[1].trim() : null;
		const points = parseGpx(body);
		if (points.length > 0) stages.push({ name: name || null, points });
	}
	if (stages.length === 0) {
		const points = parseGpx(xml);
		if (points.length > 0) stages.push({ name: null, points });
	}
	return stages;
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

// ---------------------------------------------------------------------------
// GPX writing (used by the route-builder export + fitness GPX export).
// ---------------------------------------------------------------------------

export interface GpxWritePoint {
	lat: number;
	lng: number;
	altitude?: number;
	/** Unix milliseconds. Pass null/undefined to omit `<time>`. */
	timestamp?: number | null;
}

/** Haversine distance in metres. */
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
	const R = 6371000;
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

export type AssemblyWaypoint = {
	lat: number;
	lng: number;
	altitude?: number;
	timestamp?: number | null;
};

export type AssembleResult =
	| { ok: true; points: GpxWritePoint[] }
	| { ok: false; error: string };

/**
 * Assemble track points from a sequence of waypoints and per-pair routed
 * segments, interpolating timestamps by cumulative distance between bounding
 * timestamped anchors.
 *
 * Rules:
 * - First and last waypoint MUST carry a timestamp (validated here).
 * - Intermediate waypoints MAY carry a timestamp; if present, it's used as an
 *   anchor for the surrounding interpolation segments.
 * - Track points between timestamped anchors get timestamps proportional to
 *   their cumulative-distance fraction within the anchor-to-anchor span.
 *
 * `routedSegments[i]` is the polyline from `waypoints[i]` to `waypoints[i+1]`
 * as an array of `[lng, lat, ele?]` tuples. When empty / falsy, a straight
 * great-circle segment is implied (two endpoints only).
 */
export function assembleTrackPoints(opts: {
	waypoints: AssemblyWaypoint[];
	routedSegments?: Array<Array<[number, number, number?]>>;
}): AssembleResult {
	const wps = opts.waypoints;
	if (wps.length < 2) return { ok: false, error: 'Mindestens zwei Wegpunkte nötig.' };
	if (typeof wps[0].timestamp !== 'number') {
		return { ok: false, error: 'Erster Wegpunkt benötigt einen Zeitstempel.' };
	}
	if (typeof wps[wps.length - 1].timestamp !== 'number') {
		return { ok: false, error: 'Letzter Wegpunkt benötigt einen Zeitstempel.' };
	}

	// 1. Build a flat list of points (lat/lng/altitude only for now) and remember
	//    which indices correspond to a *waypoint anchor* (vs interpolated routing
	//    vertex). Waypoint altitudes win when explicitly set, but image waypoints
	//    typically have no `altitude` of their own — in that case we inherit the
	//    routed segment's elevation at the matching endpoint, so the GPX track
	//    still has continuous altitudes across waypoint anchors.
	type FlatPoint = { lat: number; lng: number; altitude?: number; wpIndex: number | null };
	const flat: FlatPoint[] = [];
	for (let segIdx = 0; segIdx < wps.length - 1; segIdx++) {
		const a = wps[segIdx];
		const b = wps[segIdx + 1];
		const routed = opts.routedSegments?.[segIdx];
		const startRoutedEle =
			routed && routed.length > 0 && typeof routed[0][2] === 'number' ? routed[0][2] : undefined;
		const endRoutedEle =
			routed && routed.length > 0 && typeof routed[routed.length - 1][2] === 'number'
				? routed[routed.length - 1][2]
				: undefined;

		// Start of segment — explicit waypoint altitude wins, otherwise fall
		// back to the routed segment's first-vertex elevation.
		if (flat.length === 0) {
			flat.push({
				lat: a.lat,
				lng: a.lng,
				altitude: typeof a.altitude === 'number' ? a.altitude : startRoutedEle,
				wpIndex: segIdx
			});
		}
		if (routed && routed.length > 0) {
			// Skip the first vertex (== waypoint a) and last (== waypoint b); add
			// only the interior routing vertices, then explicitly add waypoint b.
			for (let i = 1; i < routed.length - 1; i++) {
				const [lng, lat, ele] = routed[i];
				flat.push({ lat, lng, altitude: typeof ele === 'number' ? ele : undefined, wpIndex: null });
			}
		}
		flat.push({
			lat: b.lat,
			lng: b.lng,
			altitude: typeof b.altitude === 'number' ? b.altitude : endRoutedEle,
			wpIndex: segIdx + 1
		});
	}

	// 2. Cumulative distance per flat point.
	const cumDist = new Array<number>(flat.length);
	cumDist[0] = 0;
	for (let i = 1; i < flat.length; i++) {
		cumDist[i] = cumDist[i - 1] + haversineM(flat[i - 1], flat[i]);
	}

	// 3. Collect anchor indices (flat-array indices of waypoints with a timestamp).
	const anchors: Array<{ flatIdx: number; t: number }> = [];
	for (let i = 0; i < flat.length; i++) {
		const wpIdx = flat[i].wpIndex;
		if (wpIdx !== null) {
			const ts = wps[wpIdx].timestamp;
			if (typeof ts === 'number') anchors.push({ flatIdx: i, t: ts });
		}
	}
	if (anchors.length < 2) {
		return { ok: false, error: 'Erster und letzter Wegpunkt benötigen Zeitstempel.' };
	}

	// 4. Walk anchor pairs, distribute timestamps by cumulative-distance fraction.
	const times = new Array<number | null>(flat.length).fill(null);
	for (let a = 0; a < anchors.length - 1; a++) {
		const A = anchors[a];
		const B = anchors[a + 1];
		const span = cumDist[B.flatIdx] - cumDist[A.flatIdx];
		const dt = B.t - A.t;
		for (let i = A.flatIdx; i <= B.flatIdx; i++) {
			const frac = span > 0 ? (cumDist[i] - cumDist[A.flatIdx]) / span : 0;
			times[i] = A.t + dt * frac;
		}
	}

	const out: GpxWritePoint[] = flat.map((p, i) => ({
		lat: p.lat,
		lng: p.lng,
		altitude: p.altitude,
		timestamp: times[i]
	}));

	return { ok: true, points: out };
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Generate a GPX 1.1 track from a list of points. */
export function buildGpxFromWaypoints(points: GpxWritePoint[], name: string): string {
	return buildGpx({ name, trackPoints: points });
}

export interface GpxImageWaypoint {
	lat: number;
	lng: number;
	altitude?: number;
	timestamp?: number | null;
	/** 8-hex-char short content hash that matches `generateImageHashClient`
	 * (browser) and `generateImageHashFromBuffer` (build script). */
	hash: string;
	/** `'private'` means anonymous viewers won't see this image on the public
	 * map — logged-in users still will. Omitted == `'public'`. */
	visibility?: 'public' | 'private';
}

/**
 * Build a GPX 1.1 document with an optional list of image waypoints.
 *
 * Image waypoints are emitted as standard `<wpt>` elements (separate from
 * the track itself), with a custom `<bocken:image hash="…"/>` extension. The
 * build script reads these back and uses the embedded coordinates instead of
 * the image's EXIF GPS — letting a contributor correct an image's position
 * by simply dragging the matching waypoint in the route-builder.
 */
function serializeTrkpts(points: GpxWritePoint[]): string {
	return points
		.map((p) => {
			const ele = typeof p.altitude === 'number' ? `        <ele>${p.altitude.toFixed(1)}</ele>\n` : '';
			const time = typeof p.timestamp === 'number'
				? `        <time>${new Date(p.timestamp).toISOString()}</time>\n`
				: '';
			return `      <trkpt lat="${p.lat}" lon="${p.lng}">\n${ele}${time}      </trkpt>`;
		})
		.join('\n');
}

export interface GpxTrack {
	name: string;
	points: GpxWritePoint[];
}

export function buildGpx(opts: {
	name: string;
	/** Single-track convenience. Ignored when `tracks` is given. */
	trackPoints?: GpxWritePoint[];
	/** One `<trk>` per stage. Each gets its own `<name>`. */
	tracks?: GpxTrack[];
	imageWaypoints?: GpxImageWaypoint[];
}): string {
	const tracks: GpxTrack[] =
		opts.tracks && opts.tracks.length > 0
			? opts.tracks
			: [{ name: opts.name, points: opts.trackPoints ?? [] }];

	const trksXml = tracks
		.map(
			(t) =>
				`  <trk>\n    <name>${escapeXml(t.name)}</name>\n    <trkseg>\n` +
				`${serializeTrkpts(t.points)}\n` +
				`    </trkseg>\n  </trk>`
		)
		.join('\n');

	const hasImages = (opts.imageWaypoints?.length ?? 0) > 0;
	const wpts = hasImages
		? opts.imageWaypoints!
				.map((w) => {
					const ele = typeof w.altitude === 'number' ? `    <ele>${w.altitude.toFixed(1)}</ele>\n` : '';
					const time = typeof w.timestamp === 'number'
						? `    <time>${new Date(w.timestamp).toISOString()}</time>\n`
						: '';
					const vis = w.visibility === 'private' ? ' visibility="private"' : '';
					return `  <wpt lat="${w.lat}" lon="${w.lng}">\n` +
						ele + time +
						`    <extensions>\n` +
						`      <bocken:image hash="${escapeXml(w.hash)}"${vis}/>\n` +
						`    </extensions>\n` +
						`  </wpt>`;
				})
				.join('\n') + '\n'
		: '';

	const ns = hasImages ? ' xmlns:bocken="https://bocken.org/gpx/v1"' : '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bocken Route Builder" xmlns="http://www.topografix.com/GPX/1/1"${ns}>
${wpts}${trksXml}
</gpx>
`;
}
