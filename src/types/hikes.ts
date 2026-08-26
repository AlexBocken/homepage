// SAC hiking difficulty scale.
export type Difficulty = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';

export type ImageVariant = {
	src: string;
	srcsetAvif: string;
	srcsetWebp: string;
	width: number;
	height: number;
	dominantColor?: string;
	/** A blurred stand-in for the image as a `data:` URI, painted as the
	 * element's background until the real file decodes: a ~28 px WebP inside an
	 * SVG that blurs it with `feGaussianBlur`, so it stays smooth however far
	 * the browser stretches it. Around a kilobyte, and needs no JavaScript. */
	blur?: string;
	alt: string;
};

export type ImagePoint = {
	src: string;        // largest WebP delivered as the popup
	thumbnail: string;  // 240w WebP used inside the on-map popup
	lat: number;
	lng: number;
	altitude?: number;
	timestamp?: number; // unix ms from EXIF DateTimeOriginal
	alt: string;
	/** Intrinsic size of `src`, so the page can reserve the right box before
	 * the photo arrives (and the blur below fills exactly that box). */
	width?: number;
	height?: number;
	/** Blurred `data:` URI placeholder — see `ImageVariant.blur`. */
	blur?: string;
	/** `'private'` images are hidden from anonymous viewers; logged-in users
	 * still see them. Omitted == public. */
	visibility?: 'public' | 'private';
};

/** A hike image addressable by its source filename, for `<HikeImage src="…">`
 * used inline in the prose. Unlike `imagePoints` these need not be route
 * waypoints (so no lat/lng/timestamp), but they carry the full responsive
 * `srcset` so prose photos still get every quality level. */
export type NamedHikeImage = ImageVariant & {
	visibility: 'public' | 'private';
};

// [lng, lat, elevation?, unixMs?]
export type HikeTrackPoint = [number, number, number?, number?];

/** One stage of a multi-day hike. Index ranges point into the flat track JSON
 * (`trackUrl`); stats are computed per stage so totals exclude the overnight
 * gaps between them. Stages are disjoint and contiguous
 * (`endIdx + 1 === next.startIdx`). */
export type HikeStage = {
	name: string;
	/** Inclusive start/end indices into the flat track. */
	startIdx: number;
	endIdx: number;
	distanceKm: number;
	durationMin: number | null;
	elevationGainM: number;
	elevationLossM: number;
	elevationMaxM: number | null;
	elevationMinM: number | null;
};

export type HikeManifestEntry = {
	slug: string;
	title: string;
	date: string;        // ISO date
	summary: string;
	author?: string;
	tags: string[];
	difficulty: Difficulty;
	hidden?: boolean;

	// Derived from GPX:
	distanceKm: number;
	durationMin: number | null;
	elevationGainM: number;
	elevationLossM: number;
	/** Highest / lowest defined trkpt altitude in metres. `null` when no trkpt
	 * carries an `<ele>` value at all. */
	elevationMaxM: number | null;
	elevationMinM: number | null;
	bbox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
	centroid: [number, number];
	previewPolyline: [number, number][];
	/** Indices into `previewPolyline` where a new disconnected run begins —
	 * set only where the gap between two stages exceeds ~1 km, so the overview
	 * doesn't draw a straight line across an overnight transfer. Absent/empty
	 * ⇒ one continuous line. */
	previewBreaks?: number[];

	/** Present only for multi-day hikes (≥2 GPX `<trk>` elements). Single-stage
	 * hikes omit it and render exactly as before. */
	stages?: HikeStage[];

	// Reverse-geocoded from the centroid (Swisstopo):
	region: string | null;
	canton: string | null;
	municipality: string | null;
	/** ISO 3166-1 alpha-2 country code (e.g. 'CH', 'DE'), detected at build
	 * time from the centroid. Swiss hikes are grouped by `canton`; hikes
	 * abroad fall back to this. Optional so pre-existing manifest entries
	 * (built before the field existed) still type-check. */
	country?: string | null;
	/** Sub-national region for a hike abroad, as OSM names it (e.g. 'Kärnten').
	 * Null in Switzerland, where `canton` covers the same level. Optional so
	 * manifest entries built before the field existed still type-check. */
	state?: string | null;

	// Recommended hiking-season window, 1-12 (Jan-Dec). When start > end the
	// window wraps the new year (e.g. 11–3 for a winter route). Absent /
	// null on both ends means no recommendation / year-round. Optional so
	// older manifest entries (built before this field existed) still type-
	// check without forcing a rebuild.
	seasonStart?: number | null;
	seasonEnd?: number | null;

	// Track + cover:
	trackUrl: string;    // /hikes/<slug>/track.<hash>.json
	pointCount: number;
	cover: ImageVariant;

	/** Optional per-route icon (URL under `/hikes/<slug>/`). Sourced from
	 * `icon.svg` / `icon.png` / `icon.jpg` / `icon.jpeg` / `icon.webp` in
	 * the hike's content directory. SVG passes through; raster is re-encoded
	 * to a small WebP. */
	icon?: string;

	/** Pre-rendered hero map (light theme): Swisstopo tiles composited at
	 * build time with the trail polyline + photo markers + start/end dots
	 * burned in. Rendered as `<img>` in the detail page so the user sees
	 * a real map immediately; Leaflet hydrates on top once the track JSON
	 * arrives. */
	heroMapUrlLight?: string;
	/** Pre-rendered hero map (dark theme). Same pose as
	 * `heroMapUrlLight` but with theme-appropriate photo-marker colours. */
	heroMapUrlDark?: string;
	/** Zoom level the static hero was rendered at. Leaflet uses this with
	 * `heroMapCenter` to land on the exact same view on first paint, so
	 * the static→interactive handover doesn't visibly shift the map. */
	heroMapZoom?: number;
	/** Map centre `[lat, lng]` the static hero was rendered around. */
	heroMapCenter?: [number, number];

	/** Medium-viewport variant (561–899 CSS px — tablets, split panes,
	 * small laptops). Pose picked for a tablet-sized container so the
	 * static→Leaflet handover lands at the same integer zoom without the
	 * "too zoomed in" mismatch the wide pose would produce at this width. */
	heroMapUrlLightMedium?: string;
	heroMapUrlDarkMedium?: string;
	heroMapZoomMedium?: number;
	heroMapCenterMedium?: [number, number];

	/** Narrow-viewport variant of the pre-rendered hero (≤ 560 CSS px).
	 * Rendered with a phone-sized `fitWidth`/`fitHeight`, so the chosen
	 * integer zoom matches what Leaflet's `fitBounds` picks at the same
	 * container size. The page shows these instead of the wide variants
	 * on small screens, otherwise the wide hero would land too zoomed-in
	 * (its pose was chosen for a 1920×640 desktop hero). */
	heroMapUrlLightNarrow?: string;
	heroMapUrlDarkNarrow?: string;
	heroMapZoomNarrow?: number;
	heroMapCenterNarrow?: [number, number];

	/** Per-hike photo payload: `/hikes/<slug>/images.<hash>.json`, shaped as
	 * `HikeImages`. It used to live inline here, but the manifest is imported
	 * by every visitor of /hikes — which shows none of these photos — and the
	 * points of 17 hikes outweighed everything else in it combined. The detail
	 * page fetches this alongside its track instead. */
	imagesUrl: string;
	/** How many route photos that payload holds, for anything that wants the
	 * count without fetching (the listing card, SEO). Includes private ones. */
	photoCount: number;
};

/** The contents of `HikeManifestEntry.imagesUrl`. */
export type HikeImages = {
	/** Geo-tagged photos, chronological — the map markers, the photo strip and
	 * the `<HikeImage idx={N} />` index space. */
	points: ImagePoint[];
	/** Images addressable by source filename for inline `<HikeImage src="…">`.
	 * Contains every encoded route photo plus any non-waypoint image referenced
	 * by name in the prose (index.svx). Keyed by source basename. */
	byName: Record<string, NamedHikeImage>;
	/** Blurred `data:` placeholders for the pre-rendered hero maps, one per
	 * theme × viewport variant (the `heroMapUrl*` fields of the manifest
	 * entry). They ride along here rather than in the manifest because only
	 * the detail page paints a hero, and it already awaits this payload. */
	heroBlur?: {
		light?: string;
		dark?: string;
		lightMedium?: string;
		darkMedium?: string;
		lightNarrow?: string;
		darkNarrow?: string;
	};
};

/** Pre-rendered hero map for the `/hikes` index page. One image covers
 * every listed hike's `previewPolyline`, coloured by SAC tier. The page
 * shows it under the sticky nav until Leaflet's first tile batch loads,
 * then fades it out — same handover pattern as the per-hike detail hero. */
export type HikesOverview = {
	/** Absolute URL of the wide (desktop) pre-rendered WebP. */
	url: string;
	/** Integer zoom the wide static was rendered at (matches Leaflet's
	 * `fitBounds(unionBounds, { padding: 32, maxZoom: 13 })` choice on a
	 * desktop-sized container). */
	zoom: number;
	/** Centre `[lat, lng]` the wide static was rendered around. */
	center: [number, number];
	/** Blurred `data:` placeholder for the wide static — see `ImageVariant.blur`. */
	blur?: string;
	/** Medium-viewport variant (561–899 CSS px). Pose picked for a tablet-
	 * sized container so the static→Leaflet handover doesn't shift the map
	 * at this width. */
	urlMedium?: string;
	zoomMedium?: number;
	centerMedium?: [number, number];
	blurMedium?: string;
	/** Narrow-viewport variant for phones (≤ 560 CSS px). Rendered at a
	 * phone-sized `fitWidth`/`fitHeight`, so the chosen zoom matches what
	 * Leaflet picks at the same container size. The page shows it instead
	 * of `url` on small screens. */
	urlNarrow?: string;
	zoomNarrow?: number;
	centerNarrow?: [number, number];
	blurNarrow?: string;
};

// ---------------------------------------------------------------------------
// Public-transport travel-time estimates (hub-and-spoke)
//
// Estimating "how long does this hike take to get to" per visitor would mean a
// live timetable query per hike per reader. Instead eleven departure hubs stand
// in for the whole country, the leg from each hub to each trailhead is fetched
// once at build time (`scripts/build-hike-travel.ts`), and the reader's own leg
// to their hub is assumed to be a flat `Hub.accessMin`. See `$lib/hikes/hubs`.
// ---------------------------------------------------------------------------

/** The hubs travel times are precomputed from. See `HUBS`. */
export type HubId =
	| 'basel'
	| 'bern'
	| 'chur'
	| 'flims'
	| 'geneve'
	| 'lausanne'
	| 'lugano'
	| 'luzern'
	| 'stgallen'
	| 'zug'
	| 'zurich';

/** The shortest connection the timetable offered for one hub→trailhead leg on
 * the sampled date — "shortest" as in smallest `duration`, picked out of the
 * same handful of options `JourneyPlanner` would list. */
export type HikeTravelLeg = {
	durationMin: number;
	transfers: number;
	/** Local `HH:MM` of that particular connection, so the estimate can show
	 * the shape of the day ("ab 06:38, an 08:32") and not just a number. */
	departure: string;
	arrival: string;
};

/** One end of a hike as the timetable knows it, plus the time of day the hike's
 * own `<JourneyPlanner>` asks for — a trailhead reachable by 08:35 and one
 * reachable by 11:00 are different questions with different answers. */
export type HikeTravelEndpoint = {
	stop: string;
	time: string; // HH:MM
	target: 'departure' | 'arrival';
	/** `'planner'` when read off a `<JourneyPlanner>` in the prose (the stop the
	 * author meant), `'track'` when guessed from the GPX end point. */
	source: 'planner' | 'track';
};

/** Precomputed legs for one hike. A hub missing from a record, or mapped to
 * `null`, means the timetable had nothing for it — usually "not reachable in
 * time", which is worth saying out loud rather than hiding. */
export type HikeTravel = {
	start: HikeTravelEndpoint | null;
	end: HikeTravelEndpoint | null;
	toStart: Partial<Record<HubId, HikeTravelLeg | null>>;
	fromEnd: Partial<Record<HubId, HikeTravelLeg | null>>;
	/** The date the sample was taken for (ISO). Timetables are seasonal, so a
	 * table sampled in February says something different about the Hoher Kasten
	 * cable car than one sampled in August. */
	sampledFor: string;
};

/** `scripts/build-hike-travel.ts` output, keyed by hike slug. */
export type HikeTravelTable = {
	generatedAt: string;
	hikes: Record<string, HikeTravel>;
};
