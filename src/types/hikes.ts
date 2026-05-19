// SAC hiking difficulty scale.
export type Difficulty = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';

export type ImageVariant = {
	src: string;
	srcsetAvif: string;
	srcsetWebp: string;
	width: number;
	height: number;
	dominantColor?: string;
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
	/** `'private'` images are hidden from anonymous viewers; logged-in users
	 * still see them. Omitted == public. */
	visibility?: 'public' | 'private';
};

// [lng, lat, elevation?, unixMs?]
export type HikeTrackPoint = [number, number, number?, number?];

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

	// Reverse-geocoded from the centroid (Swisstopo):
	region: string | null;
	canton: string | null;
	municipality: string | null;

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

	// Geo-tagged photos shown as map markers on the detail page:
	imagePoints: ImagePoint[];
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
	/** Narrow-viewport variant for phones (≤ 560 CSS px). Rendered at a
	 * phone-sized `fitWidth`/`fitHeight`, so the chosen zoom matches what
	 * Leaflet picks at the same container size. The page shows it instead
	 * of `url` on small screens. */
	urlNarrow?: string;
	zoomNarrow?: number;
	centerNarrow?: [number, number];
};
