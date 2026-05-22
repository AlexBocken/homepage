/**
 * Build-time static hero-map renderer for individual hikes.
 *
 * Fetches the Swisstopo raster tiles covering each hike's bbox, composites
 * them into one PNG via sharp, draws the trail polyline + start/end markers
 * on top, and emits a single WebP. The result is served as `<img>` in the
 * detail page's hero so the user sees an exact replica of the live map
 * during the few hundred milliseconds it takes Leaflet to dynamic-import,
 * fetch tiles, and render — eliminating the perceived load delay.
 *
 * Tiles are content-cached on disk; rendered heroes are name-cached by
 * content hash so a re-build with unchanged GPX is a no-op.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TILE_SIZE = 256;
const TILE_CACHE_DIR = path.resolve(process.cwd(), 'scripts', '.cache', 'swisstopo-tiles');
// Swisstopo serves the WMTS tiles from wmts10–wmts100. Spread across a
// couple of sub-domains so we don't hammer a single origin during initial
// build (browsers see different hosts; the disk cache makes follow-up
// builds a non-event regardless).
const SUBDOMAINS = ['wmts10', 'wmts20'] as const;
const USER_AGENT = 'bocken-homepage build-hikes';

function tileUrl(sub: string, layer: string, z: number, x: number, y: number): string {
	return `https://${sub}.geo.admin.ch/1.0.0/${layer}/default/current/3857/${z}/${x}/${y}.jpeg`;
}

/** Web Mercator: lng/lat → absolute pixel coordinate at a given zoom. */
function lngLatToPx(lng: number, lat: number, zoom: number): { x: number; y: number } {
	const n = 2 ** zoom;
	const x = ((lng + 180) / 360) * n * TILE_SIZE;
	const latRad = (lat * Math.PI) / 180;
	const y =
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE;
	return { x, y };
}

async function pathExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

/** `null` = network failure (we'll count it against the abort threshold).
 * `'blank'` = HTTP 4xx, i.e. the tile is intentionally not served — for
 * the Swisstopo Pixelkarte that means we're outside Switzerland's bbox.
 * The overview hero canvas extends into DE/IT/FR, so we treat blanks as
 * "OK, just nothing there" rather than failures. */
type TileResult = Buffer | 'blank' | null;

async function fetchTile(
	layer: string,
	z: number,
	x: number,
	y: number
): Promise<TileResult> {
	const key = `${layer.replace(/[^a-z0-9]/gi, '_')}_${z}_${x}_${y}.jpeg`;
	const cachePath = path.join(TILE_CACHE_DIR, key);
	try {
		return await fs.readFile(cachePath);
	} catch { /* miss */ }

	const sub = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
	try {
		const res = await fetch(tileUrl(sub, layer, z, x, y), {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (!res.ok) {
			// 4xx means "we don't serve this tile" (out-of-bounds for the
			// Swiss data set). Anything else (5xx) is a real failure.
			if (res.status >= 400 && res.status < 500) return 'blank';
			if (process.env.STATIC_MAP_DEBUG) {
				console.warn(`[staticHikeMap] tile ${z}/${x}/${y} HTTP ${res.status}`);
			}
			return null;
		}
		const buf = Buffer.from(await res.arrayBuffer());
		await fs.mkdir(TILE_CACHE_DIR, { recursive: true });
		await fs.writeFile(cachePath, buf);
		return buf;
	} catch (err) {
		if (process.env.STATIC_MAP_DEBUG) {
			console.warn(`[staticHikeMap] tile ${z}/${x}/${y} error:`, err);
		}
		return null;
	}
}

function escapeSvgNumber(n: number): string {
	// Keep SVG path compact but precise enough for 1600 px rendering.
	return n.toFixed(1);
}

export interface RenderStaticMapPhotoMarker {
	lat: number;
	lng: number;
}

export interface StaticMapPose {
	zoom: number;
	centerLat: number;
	centerLng: number;
	/** Origin in zoom-pixel space — top-left of the output canvas. The
	 * renderer needs it; the caller doesn't, but exposing it keeps the
	 * `computePose` ↔ `renderStaticMap` interface stateless. */
	originX: number;
	originY: number;
}

export interface ComputeStaticMapPoseOpts {
	bbox: [number, number, number, number];
	/** Canvas dimensions for centering / tile fetching. */
	width?: number;
	height?: number;
	paddingPx?: number;
	/** Reference dimensions used purely for zoom selection. Defaults to
	 * `width × height` — but pass the expected *display* size (not the
	 * rendered canvas size) when you want zoom to match Leaflet's
	 * `fitBounds` at the user's viewport. The renderer still draws the
	 * full `width × height` canvas around the chosen zoom, so wider
	 * viewports get more context without the bbox being cropped on
	 * smaller ones. */
	fitWidth?: number;
	fitHeight?: number;
	/** Upper bound on the zoom search — mirrors Leaflet's `fitBounds({ maxZoom })`.
	 * Use this when the live map clamps its zoom so the static hero doesn't
	 * land at a more detailed level than Leaflet will ever show. */
	maxZoom?: number;
}

/** Pure-math pass: pick the zoom + centre + canvas origin that the static
 * renderer would use for these inputs. Identical for light- and dark-
 * themed renders, so callers can compute it once and re-use. */
export function computeStaticMapPose(opts: ComputeStaticMapPoseOpts): StaticMapPose | null {
	const width = opts.width ?? 1600;
	const height = opts.height ?? 1000;
	const paddingPx = opts.paddingPx ?? 24;
	const fitWidth = opts.fitWidth ?? width;
	const fitHeight = opts.fitHeight ?? height;
	const maxZoom = opts.maxZoom ?? 18;

	const [minLat, minLng, maxLat, maxLng] = opts.bbox;
	if (
		!Number.isFinite(minLat) || !Number.isFinite(minLng) ||
		!Number.isFinite(maxLat) || !Number.isFinite(maxLng)
	) {
		return null;
	}

	const innerW = Math.max(1, fitWidth - 2 * paddingPx);
	const innerH = Math.max(1, fitHeight - 2 * paddingPx);

	// Pick the highest integer zoom where the bbox fits inside the
	// reference inner rectangle. This mirrors Leaflet's `fitBounds`
	// integer-zoom search, so a viewport matching `fitWidth × fitHeight`
	// will choose the same zoom Leaflet does for the same bbox.
	let zoom = 7;
	for (let z = maxZoom; z >= 7; z--) {
		const tl = lngLatToPx(minLng, maxLat, z);
		const br = lngLatToPx(maxLng, minLat, z);
		if (br.x - tl.x <= innerW && br.y - tl.y <= innerH) {
			zoom = z;
			break;
		}
	}

	const centerLat = (minLat + maxLat) / 2;
	const centerLng = (minLng + maxLng) / 2;
	const c = lngLatToPx(centerLng, centerLat, zoom);
	const originX = Math.round(c.x - width / 2);
	const originY = Math.round(c.y - height / 2);

	return { zoom, centerLat, centerLng, originX, originY };
}

export interface RenderStaticMapOpts {
	/** Pre-computed pose (zoom + centre + origin). Get this via
	 * `computeStaticMapPose(...)`. Shared by light- and dark-themed
	 * renders so both variants align perfectly. */
	pose: StaticMapPose;
	/** Track polyline as `[lat, lng]` tuples (any length). */
	polyline: Array<[number, number]>;
	color: string;
	outputPath: string;
	width?: number;
	height?: number;
	/** Swisstopo WMTS layer ID. Defaults to the schematic Pixelkarte (the
	 * same base layer Leaflet starts with on the detail page). */
	layer?: string;
	/** Optional image-point markers to burn into the SVG overlay alongside
	 * the start/end dots. Pass only the points safe to render in a public-
	 * facing image — private photos should be filtered out by the caller. */
	photoMarkers?: RenderStaticMapPhotoMarker[];
	/** Fill colour for the photo marker dots. Should match the live
	 * HikePhoto marker styling (`--color-primary`). */
	photoMarkerColor?: string;
	/** Border colour for the photo marker dots — matches the live
	 * `.hike-photo-marker .badge` `border-color: var(--color-surface)` so
	 * the static blends in with the active theme's surface colour. */
	photoMarkerBorderColor?: string;
	/** Stroke colour of the Lucide `camera` icon inside the badge. Matches
	 * the live badge's `color: var(--color-text-on-primary)` — white on
	 * the light theme's mid-blue primary, dark on the dark theme's light-
	 * blue primary. */
	photoMarkerIconColor?: string;
}

/** Fetch every Swisstopo tile covering the canvas at the given pose, then
 * composite them into a single PNG buffer. Returns `null` when fewer than
 * half the tiles arrive (a patchy hero is worse than no hero). Shared by
 * `renderStaticMap` (per-hike hero) and `renderOverviewMap` (the /hikes
 * landing-page hero) so both pull the same tile cache and use the same
 * fallback colour. */
async function composeBaseMap(
	pose: StaticMapPose,
	width: number,
	height: number,
	layer: string
): Promise<Buffer | null> {
	const { zoom, originX, originY } = pose;

	const minTileX = Math.floor(originX / TILE_SIZE);
	const maxTileX = Math.floor((originX + width - 1) / TILE_SIZE);
	const minTileY = Math.floor(originY / TILE_SIZE);
	const maxTileY = Math.floor((originY + height - 1) / TILE_SIZE);

	// Parallel tile fetches — disk cache makes follow-up builds essentially
	// free, but the first build pulls ~6–20 tiles per per-hike hero and
	// considerably more for the overview hero.
	const tileJobs: Array<{ tx: number; ty: number; left: number; top: number }> = [];
	for (let ty = minTileY; ty <= maxTileY; ty++) {
		for (let tx = minTileX; tx <= maxTileX; tx++) {
			tileJobs.push({
				tx,
				ty,
				left: tx * TILE_SIZE - originX,
				top: ty * TILE_SIZE - originY
			});
		}
	}
	const tileBufs = await Promise.all(
		tileJobs.map(async (job) => ({
			job,
			buf: await fetchTile(layer, zoom, job.tx, job.ty)
		}))
	);

	const composites: Array<{ input: Buffer; left: number; top: number }> = [];
	let networkFailures = 0;
	for (const { job, buf } of tileBufs) {
		if (buf === null) {
			networkFailures++;
			continue;
		}
		if (buf === 'blank') continue; // out-of-bounds, draw the fallback grey
		composites.push({ input: buf, left: job.left, top: job.top });
	}
	// Network-failure threshold (not "fewer than half present"): blank
	// out-of-bounds tiles are an expected outcome for the overview hero
	// that extends past Switzerland's edges, so they don't count against
	// the abort threshold.
	if (networkFailures > tileJobs.length / 2) return null;

	// Tile composite is identical regardless of UI theme — we deliberately
	// don't invert the Pixelkarte for dark mode (its colour palette doesn't
	// survive a naive invert). Only the SVG overlay above changes per theme.
	return sharp({
		create: { width, height, channels: 3, background: { r: 235, g: 235, b: 235 } }
	})
		.composite(composites)
		.png()
		.toBuffer();
}

/** Render and write a single static hero map at the given pose. Returns
 * `false` on failure (zero tiles fetched, degenerate inputs). */
export async function renderStaticMap(opts: RenderStaticMapOpts): Promise<boolean> {
	const width = opts.width ?? 1600;
	const height = opts.height ?? 1000;
	const layer = opts.layer ?? 'ch.swisstopo.pixelkarte-farbe';
	const { zoom, originX, originY } = opts.pose;

	if (opts.polyline.length < 2) return false;

	const mapBuf = await composeBaseMap(opts.pose, width, height, layer);
	if (!mapBuf) return false;

	// SVG overlay — polyline + photo markers + start/end dots.
	const pathParts: string[] = [];
	for (let i = 0; i < opts.polyline.length; i++) {
		const [lat, lng] = opts.polyline[i];
		const p = lngLatToPx(lng, lat, zoom);
		const px = p.x - originX;
		const py = p.y - originY;
		pathParts.push((i === 0 ? 'M' : 'L') + escapeSvgNumber(px) + ',' + escapeSvgNumber(py));
	}
	const start = opts.polyline[0];
	const end = opts.polyline[opts.polyline.length - 1];
	const startP = lngLatToPx(start[1], start[0], zoom);
	const endP = lngLatToPx(end[1], end[0], zoom);
	const sx = escapeSvgNumber(startP.x - originX);
	const sy = escapeSvgNumber(startP.y - originY);
	const ex = escapeSvgNumber(endP.x - originX);
	const ey = escapeSvgNumber(endP.y - originY);

	const photoMarkerColor = opts.photoMarkerColor ?? '#5e81ac';
	const photoMarkerBorderColor = opts.photoMarkerBorderColor ?? '#eceff4';
	const photoMarkerIconColor = opts.photoMarkerIconColor ?? '#fff';
	// Match HikeMap's `.hike-photo-marker .badge` — 28 px Nord-blue circle
	// with a 2 px theme-surface border, holding a 14 px theme-on-primary
	// Lucide `camera` icon. The camera icon paths are the literal Lucide
	// source (lucide-camera).
	const photoMarkers = (opts.photoMarkers ?? [])
		.map((m) => {
			const p = lngLatToPx(m.lng, m.lat, zoom);
			const cx = escapeSvgNumber(p.x - originX);
			const cy = escapeSvgNumber(p.y - originY);
			return (
				`<g transform="translate(${cx} ${cy})">` +
				`<circle r="14" fill="${photoMarkerColor}" stroke="${photoMarkerBorderColor}" stroke-width="2"/>` +
				`<g transform="translate(-7 -7) scale(0.5833)" stroke="${photoMarkerIconColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
				`<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>` +
				`<circle cx="12" cy="13" r="3"/>` +
				`</g>` +
				`</g>`
			);
		})
		.join('');

	const overlay = Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
			`<path d="${pathParts.join(' ')}" fill="none" stroke="${opts.color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95"/>` +
			photoMarkers +
			`<circle cx="${sx}" cy="${sy}" r="9" fill="#a3be8c" stroke="#fff" stroke-width="3"/>` +
			`<circle cx="${ex}" cy="${ey}" r="9" fill="#bf616a" stroke="#fff" stroke-width="3"/>` +
			`</svg>`
	);

	await sharp(mapBuf)
		.composite([{ input: overlay, left: 0, top: 0 }])
		.webp({ quality: 78 })
		.toFile(opts.outputPath);

	return true;
}

// ---------------------------------------------------------------------------
// Overview hero (one image for the whole /hikes index page).
// Same tile composite as `renderStaticMap`, but the overlay draws many
// polylines (one per hike, coloured by SAC tier) and no per-route start /
// end / photo markers — the map is a finder, not a detail view.
// ---------------------------------------------------------------------------

export interface RenderOverviewPolyline {
	points: Array<[number, number]>;
	color: string;
	/** Indices where a new disconnected sub-path begins (multi-day stage gaps
	 * >1 km), so the line isn't drawn across an overnight transfer. */
	breaks?: number[];
}

export interface RenderOverviewMapOpts {
	pose: StaticMapPose;
	polylines: RenderOverviewPolyline[];
	outputPath: string;
	width?: number;
	height?: number;
	layer?: string;
}

export async function renderOverviewMap(opts: RenderOverviewMapOpts): Promise<boolean> {
	const width = opts.width ?? 1600;
	const height = opts.height ?? 1000;
	const layer = opts.layer ?? 'ch.swisstopo.pixelkarte-farbe';
	const { zoom, originX, originY } = opts.pose;

	const drawable = opts.polylines.filter((p) => p.points.length >= 2);
	if (drawable.length === 0) return false;

	const mapBuf = await composeBaseMap(opts.pose, width, height, layer);
	if (!mapBuf) return false;

	// One <path> per hike polyline. The overview map is rendered fairly
	// zoomed-out, so even ≤150-point preview polylines stay compact.
	const paths = drawable
		.map((line) => {
			const breakSet = new Set(line.breaks ?? []);
			const parts: string[] = [];
			for (let i = 0; i < line.points.length; i++) {
				const [lat, lng] = line.points[i];
				const p = lngLatToPx(lng, lat, zoom);
				const px = p.x - originX;
				const py = p.y - originY;
				// Start a fresh sub-path at index 0 and at every stage break.
				const cmd = i === 0 || breakSet.has(i) ? 'M' : 'L';
				parts.push(cmd + escapeSvgNumber(px) + ',' + escapeSvgNumber(py));
			}
			return (
				`<path d="${parts.join(' ')}" fill="none" stroke="${line.color}" ` +
				`stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/>`
			);
		})
		.join('');

	const overlay = Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
			paths +
			`</svg>`
	);

	await sharp(mapBuf)
		.composite([{ input: overlay, left: 0, top: 0 }])
		.webp({ quality: 78 })
		.toFile(opts.outputPath);

	return true;
}
