/**
 * Pure GPX serializer usable from both server scripts and the browser.
 * Kept dependency-free so the route-builder can bundle it for client-side
 * GPX export without dragging in Node-only helpers.
 */

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
export function buildGpx(opts: {
	name: string;
	trackPoints: GpxWritePoint[];
	imageWaypoints?: GpxImageWaypoint[];
}): string {
	const trkpts = opts.trackPoints
		.map((p) => {
			const ele = typeof p.altitude === 'number' ? `        <ele>${p.altitude.toFixed(1)}</ele>\n` : '';
			const time = typeof p.timestamp === 'number'
				? `        <time>${new Date(p.timestamp).toISOString()}</time>\n`
				: '';
			return `      <trkpt lat="${p.lat}" lon="${p.lng}">\n${ele}${time}      </trkpt>`;
		})
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
${wpts}  <trk>
    <name>${escapeXml(opts.name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}
