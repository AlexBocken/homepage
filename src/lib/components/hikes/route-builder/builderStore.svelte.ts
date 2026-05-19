/**
 * State for the route-builder editor.
 *
 * The whole store is a single $state object so any field — waypoints,
 * routed segments, profile — automatically reactivates dependent UI
 * (table rows, map markers, polyline). Draft state is mirrored to
 * `localStorage` so accidental tab close doesn't lose work.
 */

import { browser } from '$app/environment';
import { parseGpx, parseGpxImageRefs } from '$lib/gpx';

export type RoutingProfile = 'hiking-mountain' | 'trekking' | 'road';

export type ImageVisibility = 'public' | 'private';

export type Waypoint = {
	id: string;
	lat: number;
	lng: number;
	altitude?: number;
	timestamp?: number | null;
	thumbnail?: string;  // optional base64 preview for marker badge + table row
	/** First 8 hex chars of the source image's sha256 content hash. Matches
	 * the same scheme used by the build script's output filenames so the
	 * build can re-attach the image to this user-corrected position. */
	imageHash?: string;
	/** Whether the image should be visible to anonymous viewers. Both values
	 * embed the image in the GPX export — private images are simply hidden
	 * from the public map unless the viewer is logged in. Defaults to
	 * `'public'`; only meaningful when `imageHash` is set. */
	imageVisibility?: ImageVisibility;
	/** When true, this waypoint represents an image with a known timestamp
	 * but unknown location — the user still needs to drop it on the map.
	 * Lat/lng are placeholders (0/0) and the waypoint is hidden from the map
	 * and excluded from GPX export until placed. */
	unplaced?: boolean;
};

export type BuilderState = {
	name: string;
	profile: RoutingProfile;
	/** When true, newly created segments are snapped to the trail network via
	 * the routing API. When false, new segments use a direct straight line.
	 * Existing (already-snapped) segments are preserved across toggle. */
	autoSnap: boolean;
	waypoints: Waypoint[];
	/** One coordinate run per consecutive-waypoint pair (snapped or linear). */
	routedSegments: Array<Array<[number, number, number?]>>; // [lng, lat, ele?]
	/** Parallel record of which waypoint pair each `routedSegments[i]` was
	 * built for — by id AND by coordinate. Both must match for the segment to
	 * be considered still valid, so a drag (same id, new coords) correctly
	 * invalidates the adjacent segments. */
	segmentSources: Array<SegmentSource>;
};

export type SegmentSource = {
	startId: string;
	endId: string;
	startLat: number;
	startLng: number;
	endLat: number;
	endLng: number;
};

const STORAGE_KEY = 'hikes:route-builder:draft';

function loadDraft(): BuilderState {
	if (!browser) return defaultState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed = JSON.parse(raw) as BuilderState;
		if (!parsed || !Array.isArray(parsed.waypoints)) return defaultState();
		// Migrate older drafts that used `showImageOnMap` (boolean) instead of
		// the new `imageVisibility` enum: false → private, anything else → public.
		const waypoints = parsed.waypoints.map((w) => {
			const legacy = w as Waypoint & { showImageOnMap?: boolean };
			if (legacy.imageVisibility === undefined && legacy.showImageOnMap === false) {
				return { ...legacy, imageVisibility: 'private' as const, showImageOnMap: undefined };
			}
			return legacy;
		});
		return {
			name: parsed.name ?? '',
			profile: parsed.profile ?? 'hiking-mountain',
			autoSnap: parsed.autoSnap !== false,
			waypoints,
			routedSegments: Array.isArray(parsed.routedSegments) ? parsed.routedSegments : [],
			segmentSources: Array.isArray(parsed.segmentSources) ? parsed.segmentSources : []
		};
	} catch {
		return defaultState();
	}
}

function defaultState(): BuilderState {
	return {
		name: '',
		profile: 'hiking-mountain',
		autoSnap: true,
		waypoints: [],
		routedSegments: [],
		segmentSources: []
	};
}

export const builder = $state<BuilderState>(loadDraft());

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave(): void {
	if (!browser) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(builder));
		} catch {
			/* localStorage may be unavailable in private mode */
		}
	}, 300);
}

export function clearDraft(): void {
	builder.name = '';
	builder.profile = 'hiking-mountain';
	builder.autoSnap = true;
	builder.waypoints.splice(0, builder.waypoints.length);
	builder.routedSegments.splice(0, builder.routedSegments.length);
	builder.segmentSources.splice(0, builder.segmentSources.length);
	if (browser) {
		try {
			window.localStorage.removeItem(STORAGE_KEY);
		} catch { /* ignored */ }
	}
}

export function nextWaypointId(): string {
	return Math.random().toString(36).slice(2, 10);
}

/**
 * Insert `wp` into `builder.waypoints` so that timestamped waypoints stay in
 * chronological order. Waypoints without a timestamp (map-click clicks,
 * draft scribbles) act as transparent neighbours — they don't affect sorting.
 * Without a timestamp on the new waypoint, falls back to a plain append.
 */
export function insertWaypointChronologically(wp: Waypoint): void {
	if (typeof wp.timestamp !== 'number') {
		builder.waypoints.push(wp);
		scheduleSave();
		return;
	}
	const t = wp.timestamp;
	let insertIdx = builder.waypoints.length;
	for (let i = 0; i < builder.waypoints.length; i++) {
		const other = builder.waypoints[i].timestamp;
		if (typeof other === 'number' && other > t) {
			insertIdx = i;
			break;
		}
	}
	builder.waypoints.splice(insertIdx, 0, wp);
	scheduleSave();
}

function makeSource(a: Waypoint, b: Waypoint): SegmentSource {
	return {
		startId: a.id,
		endId: b.id,
		startLat: a.lat,
		startLng: a.lng,
		endLat: b.lat,
		endLng: b.lng
	};
}

function sourcesMatch(s: SegmentSource, a: Waypoint, b: Waypoint): boolean {
	return (
		s.startId === a.id &&
		s.endId === b.id &&
		s.startLat === a.lat &&
		s.startLng === a.lng &&
		s.endLat === b.lat &&
		s.endLng === b.lng
	);
}

export function setRoutedSegments(segments: Array<Array<[number, number, number?]>>): void {
	builder.routedSegments.splice(0, builder.routedSegments.length, ...segments);
	const sources: SegmentSource[] = [];
	for (let i = 0; i < builder.waypoints.length - 1 && i < segments.length; i++) {
		sources.push(makeSource(builder.waypoints[i], builder.waypoints[i + 1]));
	}
	builder.segmentSources.splice(0, builder.segmentSources.length, ...sources);
}

/**
 * Walk the current waypoint pairs and rebuild `routedSegments` so it aligns
 * 1:1 with consecutive waypoint pairs. A segment is preserved verbatim only
 * when both endpoints match (same id AND same lat/lng) — a waypoint drag
 * keeps the id but changes coords, which is exactly when the snapped geometry
 * goes stale. Stale pairs are replaced with a straight two-point linear
 * placeholder; if autoSnap is on, the page's snapToRoute call will overwrite
 * them shortly after.
 */
export function reconcileSegments(): void {
	const newSegs: Array<Array<[number, number, number?]>> = [];
	const newSources: SegmentSource[] = [];
	// Walk only placed waypoints — unplaced ones (image without location) sit
	// in the table but don't participate in the track until the user drops
	// them on the map.
	const placed: Waypoint[] = [];
	for (const w of builder.waypoints) {
		if (!w.unplaced) placed.push(w);
	}
	for (let i = 0; i < placed.length - 1; i++) {
		const a = placed[i];
		const b = placed[i + 1];
		const oldIdx = builder.segmentSources.findIndex((s) => sourcesMatch(s, a, b));
		if (oldIdx >= 0 && builder.routedSegments[oldIdx]) {
			newSegs.push(builder.routedSegments[oldIdx]);
			newSources.push(builder.segmentSources[oldIdx]);
		} else {
			newSegs.push([
				[a.lng, a.lat, a.altitude],
				[b.lng, b.lat, b.altitude]
			]);
			newSources.push(makeSource(a, b));
		}
	}
	builder.routedSegments.splice(0, builder.routedSegments.length, ...newSegs);
	builder.segmentSources.splice(0, builder.segmentSources.length, ...newSources);
}

/** Haversine distance in metres between two `[lng, lat]` points.
 *  Inline so this module can stay client-only (the server helpers live in
 *  `$lib/server/hikesRouting.ts` and aren't importable here). */
function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
	const R = 6_371_000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Expand every 2-point linear segment into evenly-spaced intermediate
 * points so an elevation enrichment pass can capture the terrain profile
 * between the two waypoints. Snapped segments (already many points from
 * BRouter/OSRM) are left alone.
 *
 * `spacingM` defaults to 25 m — matches the coarsest Swisstopo DTM that
 * we sample against; finer spacing would just sample the same elevation
 * value twice. Very short segments (< 30 m) skip densification: the two
 * endpoints already capture every meaningful elevation step within
 * Swisstopo's DTM resolution at that distance.
 *
 * Returns `true` when at least one segment was densified (caller can use
 * this to decide whether to fire a fresh elevation request).
 */
export function densifyLinearSegments(spacingM = 25): boolean {
	let densifiedAny = false;
	for (let i = 0; i < builder.routedSegments.length; i++) {
		const seg = builder.routedSegments[i];
		if (seg.length !== 2) continue; // already snapped or already densified
		const [lngA, latA, altA] = seg[0];
		const [lngB, latB, altB] = seg[1];
		const dist = haversineMeters(lngA, latA, lngB, latB);
		if (dist < 30) continue;
		// At least 4 sub-segments so even a 30-m linear sample gets a usable
		// elevation profile; longer segments scale up to keep ~25 m spacing.
		const n = Math.max(4, Math.ceil(dist / spacingM));
		const out: Array<[number, number, number?]> = new Array(n + 1);
		for (let j = 0; j <= n; j++) {
			const f = j / n;
			// Endpoints keep whatever altitude the caller supplied (typically
			// `undefined` here — enrichment fills both ends + everything between);
			// intermediates are seeded as `undefined` so the enrichment step
			// knows to fill them.
			const alt = j === 0 ? altA : j === n ? altB : undefined;
			out[j] = [lngA + (lngB - lngA) * f, latA + (latB - latA) * f, alt];
		}
		builder.routedSegments[i] = out;
		densifiedAny = true;
	}
	return densifiedAny;
}

export function setElevations(elevations: (number | null)[]): void {
	// elevations are aligned with the flattened routedSegments points; fold them
	// back into the per-segment arrays.
	let idx = 0;
	for (const seg of builder.routedSegments) {
		for (let i = 0; i < seg.length; i++) {
			const e = elevations[idx++];
			if (typeof e === 'number') {
				seg[i] = [seg[i][0], seg[i][1], e];
			}
		}
	}
}

// ---------------------------------------------------------------------------
// GPX import — restores the builder state from a previously-exported GPX so
// the user can iterate on an existing route (add a waypoint, retag an
// image, fix a turn) without losing the densified track or photo anchors.
// ---------------------------------------------------------------------------

export type ImportGpxResult =
	| { ok: true; trackName: string | null; waypointCount: number; imageCount: number }
	| { ok: false; error: string };

/** Coordinate equality with a small tolerance — float round-trips through
 *  the GPX writer can shift the 7th decimal. 1e-5° ≈ 1 m, well below the
 *  spacing of any meaningful pair of anchors on a hike. */
function coordsClose(aLat: number, aLng: number, bLat: number, bLng: number): boolean {
	return Math.abs(aLat - bLat) < 1e-5 && Math.abs(aLng - bLng) < 1e-5;
}

/**
 * Reconstruct the builder state from a GPX XML string.
 *
 * Strategy: the exported GPX interleaves user-anchor waypoints with
 * densified/snapped intermediate trkpts in a single `<trkseg>`. We don't
 * try to round-trip "manual waypoints" vs "intermediates" perfectly —
 * instead we recover the *image* anchors (matched against `<wpt>` entries
 * by coordinate), plus the very first and last trkpts (start + end), and
 * rebuild routedSegments from the trkpts that fall between each adjacent
 * anchor pair. Result is an editable route where every photo waypoint is
 * a draggable handle and the geometry between handles is preserved
 * verbatim — no re-routing required.
 *
 * Replaces the existing draft. Caller should confirm with the user if the
 * builder is non-empty.
 */
export function importGpx(xml: string): ImportGpxResult {
	const trk = parseGpx(xml);
	if (trk.length < 2) {
		return { ok: false, error: 'GPX enthält keinen verwertbaren Track (mind. zwei trkpt nötig).' };
	}
	const imageRefs = parseGpxImageRefs(xml);
	const imageList = Object.values(imageRefs);

	// Optional <name> on the track or top-level metadata.
	const nameMatch =
		xml.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/trk>/i) ??
		xml.match(/<metadata>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/metadata>/i);
	const trackName = nameMatch ? nameMatch[1].trim() : null;

	// Map each image waypoint to its first matching trkpt index. Order the
	// image anchors by that index so they slot into the builder in
	// traversal order, not GPX-declaration order.
	type ImageAnchor = {
		trkIdx: number;
		hash: string;
		visibility: 'public' | 'private';
		lat: number;
		lng: number;
		altitude?: number;
		timestamp?: number;
	};
	const imageAnchors: ImageAnchor[] = [];
	for (const ref of imageList) {
		let bestIdx = -1;
		for (let i = 0; i < trk.length; i++) {
			if (coordsClose(trk[i].lat, trk[i].lng, ref.lat, ref.lng)) {
				bestIdx = i;
				break;
			}
		}
		if (bestIdx < 0) continue; // wpt position doesn't match any trkpt — skip
		imageAnchors.push({
			trkIdx: bestIdx,
			hash: ref.hash,
			visibility: ref.visibility === 'private' ? 'private' : 'public',
			lat: ref.lat,
			lng: ref.lng,
			altitude: ref.altitude,
			timestamp: ref.timestamp
		});
	}
	imageAnchors.sort((a, b) => a.trkIdx - b.trkIdx);

	// Build the set of anchor trkpt indices: first, last, all image anchors.
	const anchorIndices = new Set<number>([0, trk.length - 1]);
	for (const ia of imageAnchors) anchorIndices.add(ia.trkIdx);
	const sortedAnchorIdx = [...anchorIndices].sort((a, b) => a - b);

	// Assemble waypoints in traversal order.
	const newWaypoints: Waypoint[] = sortedAnchorIdx.map((i) => {
		const t = trk[i];
		const ia = imageAnchors.find((a) => a.trkIdx === i);
		const wp: Waypoint = {
			id: nextWaypointId(),
			lat: t.lat,
			lng: t.lng,
			altitude: typeof t.altitude === 'number' ? t.altitude : ia?.altitude,
			timestamp: t.timestamp ?? ia?.timestamp ?? null
		};
		if (ia) {
			wp.imageHash = ia.hash;
			wp.imageVisibility = ia.visibility;
		}
		return wp;
	});

	// Reconstruct routedSegments from the trkpts between consecutive anchors.
	// Each segment is `[lng, lat, ele?][]` and spans anchor[i] .. anchor[i+1]
	// inclusive — the GPX writer's reverse operation.
	const newSegments: Array<Array<[number, number, number?]>> = [];
	for (let i = 0; i < sortedAnchorIdx.length - 1; i++) {
		const start = sortedAnchorIdx[i];
		const end = sortedAnchorIdx[i + 1];
		const seg: Array<[number, number, number?]> = [];
		for (let j = start; j <= end; j++) {
			const t = trk[j];
			seg.push([t.lng, t.lat, typeof t.altitude === 'number' ? t.altitude : undefined]);
		}
		newSegments.push(seg);
	}

	const newSources: SegmentSource[] = [];
	for (let i = 0; i < newWaypoints.length - 1; i++) {
		newSources.push(makeSource(newWaypoints[i], newWaypoints[i + 1]));
	}

	// Atomic swap.
	builder.name = trackName ?? builder.name ?? '';
	// Disable auto-snap so the imported densified/snapped geometry isn't
	// immediately overwritten by a routing API call.
	builder.autoSnap = false;
	builder.waypoints.splice(0, builder.waypoints.length, ...newWaypoints);
	builder.routedSegments.splice(0, builder.routedSegments.length, ...newSegments);
	builder.segmentSources.splice(0, builder.segmentSources.length, ...newSources);
	scheduleSave();

	return {
		ok: true,
		trackName,
		waypointCount: newWaypoints.length,
		imageCount: imageAnchors.length
	};
}
