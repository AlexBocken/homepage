/**
 * State for the route-builder editor.
 *
 * The whole store is a single $state object so any field — waypoints,
 * routed segments, profile — automatically reactivates dependent UI
 * (table rows, map markers, polyline). Draft state is mirrored to
 * `localStorage` so accidental tab close doesn't lose work.
 */

import { browser } from '$app/environment';

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
