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

	// Geo-tagged photos shown as map markers on the detail page:
	imagePoints: ImagePoint[];
};
