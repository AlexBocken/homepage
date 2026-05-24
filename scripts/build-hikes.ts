/**
 * Build script for the /hikes route.
 *
 * For each directory under `src/content/hikes/<slug>/`:
 *   1. Parse `index.svx` frontmatter (lightweight in-house parser, schema is small).
 *   2. Parse `track.gpx` and derive distance / elevation gain / loss / bbox /
 *      centroid / duration / preview polyline.
 *   3. Reverse-geocode the centroid via Swisstopo (cached on disk).
 *   4. Process every image in `images/` with sharp into AVIF + WebP at 3 widths
 *      and emit srcset strings. Only encode images whose hash is referenced
 *      and collect them as `imagePoints` for on-map markers.
 *   5. Write `static/hikes/<slug>/track.<hash>.json` (compact tuple format).
 * Emits `src/lib/data/hikes.generated.ts` containing the typed manifest used
 * by the `/hikes` overview page.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';
import {
	parseGpxStages,
	parseGpxImageRefs,
	trackDistance,
	haversine,
	type GpxImageRef,
	type GpxPoint,
	type GpxStage
} from '../src/lib/server/gpx.js';
import { simplifyTrack } from '../src/lib/server/simplifyTrack.js';
import { computeStaticMapPose, renderOverviewMap, renderStaticMap } from './staticHikeMap.js';
import { sacTrailColor, SAC_TRAIL_COLOR } from '../src/lib/data/sacColors.js';
import { computeElevationStats, computeElevationRange } from '../src/lib/hikes/elevation.js';
import type {
	Difficulty,
	HikeManifestEntry,
	HikeStage,
	HikesOverview,
	ImagePoint,
	ImageVariant
} from '../src/types/hikes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'hikes');
// Track JSON stays under /static — it's public preview data and SvelteKit
// serves it directly with the rest of the site. URL: /hikes/<slug>/track.*.json
const STATIC_DIR = path.join(ROOT, 'static', 'hikes');
// Image binaries live outside /static so they aren't bundled into the Node
// build or served by SvelteKit. The deploy step rsyncs this tree to
// /var/www/static/hikes/ on the server, where nginx serves public images
// directly and gates `/private/` images through Node + X-Accel-Redirect.
const HIKES_ASSETS_DIR = path.join(ROOT, 'hikes-assets');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');
const GEOCODE_CACHE_FILE = path.join(CACHE_DIR, 'hikes-geocode.json');
const MANIFEST_OUT = path.join(ROOT, 'src', 'lib', 'data', 'hikes.generated.ts');

const PREVIEW_POLYLINE_MAX_POINTS = 150;
const IMAGE_WIDTHS = [480, 960, 1600] as const;
const IMAGE_THUMBNAIL_WIDTH = 240;  // popup thumbnail for map markers
const MANIFEST_WARN_BYTES = 200_000;

const VALID_DIFFICULTIES: readonly Difficulty[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

// Sharp pipelines are CPU-heavy but release the JS thread while libvips runs,
// so a small concurrency pool gives a near-linear speed-up. Cap at 4 to avoid
// thrashing on smaller boxes (a single AVIF encode can saturate one core).
const IMAGE_CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 4));

async function pathExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

async function runWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			results[i] = await worker(items[i], i);
		}
	});
	await Promise.all(runners);
	return results;
}

// ---------------------------------------------------------------------------
// Tiny frontmatter parser (no deps).
// Supports: strings, numbers, booleans, ISO dates (kept as string),
// and bracketed arrays of strings: `[a, b, "c d"]`.
// ---------------------------------------------------------------------------

type Frontmatter = Record<string, string | number | boolean | string[]>;

function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: source };

	const data: Frontmatter = {};
	for (const rawLine of match[1].split(/\r?\n/)) {
		const line = rawLine.replace(/\s+#.*$/, '').trim();
		if (!line || line.startsWith('#')) continue;
		const sep = line.indexOf(':');
		if (sep < 0) continue;
		const key = line.slice(0, sep).trim();
		const raw = line.slice(sep + 1).trim();
		data[key] = parseScalar(raw);
	}
	return { data, body: match[2] };
}

function parseScalar(raw: string): string | number | boolean | string[] {
	if (raw === '') return '';
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	if (raw.startsWith('[') && raw.endsWith(']')) {
		return raw
			.slice(1, -1)
			.split(',')
			.map(s => stripQuotes(s.trim()))
			.filter(s => s.length > 0);
	}
	if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
	return stripQuotes(raw);
}

function stripQuotes(s: string): string {
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		return s.slice(1, -1);
	}
	return s;
}

/** Parse a `seasons` frontmatter value into `{ seasonStart, seasonEnd }`.
 *  Accepts:
 *    - a numeric range string `"4-9"` (April through September)
 *    - a 3-letter / full English month range `"apr-sep"` or `"april-september"`
 *    - an array of two numbers `[4, 9]`
 *  Returns `{ seasonStart: null, seasonEnd: null }` when absent or malformed. */
function parseSeasonRange(raw: unknown): { seasonStart: number | null; seasonEnd: number | null } {
	const empty = { seasonStart: null, seasonEnd: null };
	if (raw == null || raw === '') return empty;

	const MONTHS: Record<string, number> = {
		jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
		apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
		aug: 8, august: 8, sep: 9, september: 9, sept: 9, oct: 10, october: 10,
		nov: 11, november: 11, dec: 12, december: 12
	};
	const toMonth = (v: string | number): number | null => {
		if (typeof v === 'number') return v >= 1 && v <= 12 ? v : null;
		const s = String(v).trim().toLowerCase();
		if (/^\d+$/.test(s)) {
			const n = parseInt(s, 10);
			return n >= 1 && n <= 12 ? n : null;
		}
		return MONTHS[s] ?? null;
	};

	let parts: Array<string | number> | null = null;
	if (Array.isArray(raw) && raw.length === 2) {
		parts = raw as Array<string | number>;
	} else if (typeof raw === 'string' && raw.includes('-')) {
		parts = raw.split('-').map((s) => s.trim());
	}
	if (!parts) return empty;

	const a = toMonth(parts[0]);
	const b = toMonth(parts[1]);
	if (a == null || b == null) return empty;
	return { seasonStart: a, seasonEnd: b };
}

// ---------------------------------------------------------------------------
// Bounding box / centroid
// ---------------------------------------------------------------------------

function computeBboxAndCentroid(track: GpxPoint[]): {
	bbox: [number, number, number, number];
	centroid: [number, number];
} {
	let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
	let sumLat = 0, sumLng = 0;
	for (const p of track) {
		if (p.lat < minLat) minLat = p.lat;
		if (p.lat > maxLat) maxLat = p.lat;
		if (p.lng < minLng) minLng = p.lng;
		if (p.lng > maxLng) maxLng = p.lng;
		sumLat += p.lat;
		sumLng += p.lng;
	}
	const n = track.length || 1;
	return {
		bbox: [minLat, minLng, maxLat, maxLng],
		centroid: [sumLat / n, sumLng / n]
	};
}

// Overview preview polyline. Stages whose join gap exceeds this are drawn as
// separate runs (a break) so the overview doesn't connect across an overnight
// transfer; closer stages stay one continuous line.
const PREVIEW_GAP_BREAK_KM = 1;

function buildPreview(stages: GpxStage[]): {
	previewPolyline: [number, number][];
	previewBreaks: number[];
} {
	// Group consecutive stages into runs, splitting only at a significant gap.
	const runs: GpxPoint[][] = [];
	let current: GpxPoint[] = [];
	for (let i = 0; i < stages.length; i++) {
		if (i > 0 && current.length > 0) {
			const prevEnd = stages[i - 1].points[stages[i - 1].points.length - 1];
			const curStart = stages[i].points[0];
			if (haversine(prevEnd, curStart) > PREVIEW_GAP_BREAK_KM) {
				runs.push(current);
				current = [];
			}
		}
		current.push(...stages[i].points);
	}
	if (current.length > 0) runs.push(current);

	// One run (every single-stage hike, and multi-stage hikes with only small
	// gaps): identical to the previous behaviour — one simplified line.
	if (runs.length <= 1) {
		return {
			previewPolyline: simplifyTrack(runs[0] ?? [], PREVIEW_POLYLINE_MAX_POINTS) as [number, number][],
			previewBreaks: []
		};
	}

	// Multiple runs: simplify each within a proportional point budget so the
	// total stays near PREVIEW_POLYLINE_MAX_POINTS, recording the run starts.
	const total = runs.reduce((a, r) => a + r.length, 0) || 1;
	const previewPolyline: [number, number][] = [];
	const previewBreaks: number[] = [];
	for (const run of runs) {
		if (previewPolyline.length > 0) previewBreaks.push(previewPolyline.length);
		const budget = Math.max(2, Math.round((PREVIEW_POLYLINE_MAX_POINTS * run.length) / total));
		previewPolyline.push(...(simplifyTrack(run, budget) as [number, number][]));
	}
	return { previewPolyline, previewBreaks };
}

// ---------------------------------------------------------------------------
// Swisstopo reverse-geocode with disk cache
// ---------------------------------------------------------------------------

type GeocodeResult = {
	canton: string | null;
	municipality: string | null;
	region: string | null;
	/** ISO 3166-1 alpha-2 code. 'CH' whenever a Swiss canton matched;
	 * otherwise resolved via an OSM/Nominatim country lookup. */
	country: string | null;
};

type GeocodeCache = Record<string, GeocodeResult>;

async function loadGeocodeCache(): Promise<GeocodeCache> {
	try {
		const raw = await fs.readFile(GEOCODE_CACHE_FILE, 'utf-8');
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

async function saveGeocodeCache(cache: GeocodeCache): Promise<void> {
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(GEOCODE_CACHE_FILE, JSON.stringify(cache, null, 2));
}

const SWISSTOPO_UA = 'bocken-homepage build-hikes';
const NOMINATIM_UA = 'bocken-homepage build-hikes (https://bocken.org)';

/**
 * Country detection for hikes outside Switzerland. Swisstopo only covers CH,
 * so when no canton matched we ask OSM/Nominatim for the country at the
 * centroid. Returns an uppercase ISO 3166-1 alpha-2 code, or null on failure.
 */
async function reverseGeocodeCountry(lat: number, lng: number): Promise<string | null> {
	const url =
		`https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
		`&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } });
		if (!res.ok) {
			console.warn(`[build-hikes] Nominatim country lookup failed (${res.status})`);
			return null;
		}
		const json = (await res.json()) as { address?: { country_code?: string } };
		const cc = json.address?.country_code;
		return typeof cc === 'string' ? cc.toUpperCase() : null;
	} catch (err) {
		console.warn('[build-hikes] Nominatim country lookup error:', err);
		return null;
	}
}

async function fetchFeatureName(layerBodId: string, featureId: number | string): Promise<string | null> {
	const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/${layerBodId}/${featureId}/htmlPopup?lang=de`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': SWISSTOPO_UA } });
		if (!res.ok) return null;
		const html = await res.text();
		// htmlPopup label is "Name" for cantons and "Amtlicher Gemeindename" for municipalities.
		const m =
			html.match(/<td[^>]*>(?:Amtlicher\s+Gemeindename|Name)<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
		return m ? m[1].trim() : null;
	} catch {
		return null;
	}
}

async function reverseGeocode(
	lat: number,
	lng: number,
	cache: GeocodeCache
): Promise<GeocodeResult> {
	const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
	// `country` post-dates the cache format — re-resolve entries that predate it.
	if (cache[key] && cache[key].country !== undefined) return cache[key];

	const layers =
		'all:ch.swisstopo.swissboundaries3d-kanton-flaeche.fill,' +
		'ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill';
	// Tight 1000x1000 imageDisplay over a 0.0002 deg mapExtent with 1px tolerance
	// gives ~2 cm of effective tolerance around the centroid — enough to land in
	// the correct kanton/gemeinde without picking up neighbours.
	const eps = 0.0001;
	const url =
		`https://api3.geo.admin.ch/rest/services/api/MapServer/identify` +
		`?geometry=${lng},${lat}` +
		`&geometryType=esriGeometryPoint&geometryFormat=geojson&returnGeometry=false` +
		`&imageDisplay=1000,1000,96` +
		`&mapExtent=${lng - eps},${lat - eps},${lng + eps},${lat + eps}` +
		`&tolerance=1&layers=${layers}&sr=4326`;

	const result: GeocodeResult = { canton: null, municipality: null, region: null, country: null };
	try {
		const res = await fetch(url, { headers: { 'User-Agent': SWISSTOPO_UA } });
		if (res.ok) {
			type IdentifyRow = { layerBodId?: string; layerName?: string; featureId?: number | string; id?: number | string };
			const json = (await res.json()) as { results?: IdentifyRow[] };
			// Identify returns historical boundary records too, so we only need the
			// first hit per layer.
			for (const r of json.results ?? []) {
				const layerBodId = r.layerBodId;
				const featureId = r.featureId ?? r.id;
				if (!layerBodId || featureId === undefined) continue;
				if (layerBodId.includes('kanton') && result.canton) continue;
				if (layerBodId.includes('gemeinde') && result.municipality) continue;
				const name = await fetchFeatureName(layerBodId, featureId);
				if (!name) continue;
				if (layerBodId.includes('kanton')) result.canton = name;
				else if (layerBodId.includes('gemeinde')) result.municipality = name;
			}
			result.region = result.municipality ?? result.canton;
		} else {
			console.warn(`[build-hikes] Swisstopo identify failed (${res.status}) for ${key}`);
		}
	} catch (err) {
		console.warn(`[build-hikes] Swisstopo identify error for ${key}:`, err);
	}

	// Country: 'CH' when a Swiss canton matched (no extra request needed),
	// otherwise an OSM/Nominatim lookup for hikes abroad.
	result.country = result.canton ? 'CH' : await reverseGeocodeCountry(lat, lng);

	cache[key] = result;
	return result;
}

// ---------------------------------------------------------------------------
// Image processing (sharp -> AVIF + WebP at multiple widths)
// ---------------------------------------------------------------------------

function shortHashOfBuffer(buf: Buffer): string {
	return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

async function processImage(
	srcPath: string,
	slug: string,
	alt: string,
	gpxImageRefs: Record<string, GpxImageRef>
): Promise<
	| { variant: ImageVariant; thumbnailRelUrl: string; largestRelUrl: string; hash: string; visibility: 'public' | 'private'; cached: boolean; outNames: string[] }
	| { skipped: true; hash: string }
> {
	const buffer = await fs.readFile(srcPath);
	const hash = shortHashOfBuffer(buffer);
	const ref = gpxImageRefs[hash];
	if (!ref) {
		// Not referenced by any waypoint in track.gpx — drop it entirely (no
		// encode, no manifest entry, no static output). Authors who want an
		// image published must place it on the route via the route-builder
		// (which writes a `<bocken:image hash>` waypoint into track.gpx).
		return { skipped: true, hash };
	}
	const visibility: 'public' | 'private' = ref.visibility === 'private' ? 'private' : 'public';
	// Public images go under `images/` (served directly by nginx); private ones
	// under `private/` (proxied through Node for the auth check, then handed off
	// via X-Accel-Redirect). The encode itself is shared with the cover image.
	const segment = visibility === 'private' ? 'private' : 'images';
	const enc = await encodeImageVariant(buffer, hash, slug, segment, alt);
	return { ...enc, hash, visibility };
}

/**
 * Encode one already-loaded image into the responsive AVIF/WebP variant set
 * (+ a thumbnail) under `<slug>/<segment>/`, named by content hash so existing
 * encodes are reused and stale ones get swept. Shared by route photos
 * (`processImage`) and the explicit cover image (`processCover`).
 */
async function encodeImageVariant(
	buffer: Buffer,
	hash: string,
	slug: string,
	segment: 'images' | 'private',
	alt: string
): Promise<{
	variant: ImageVariant;
	thumbnailRelUrl: string;
	largestRelUrl: string;
	cached: boolean;
	outNames: string[];
}> {
	// Filenames are content-hash only — the source basename (which usually
	// encodes a date + camera ID) is intentionally dropped so it doesn't leak
	// into the published URLs.
	const outDir = path.join(HIKES_ASSETS_DIR, slug, segment);
	await fs.mkdir(outDir, { recursive: true });

	const meta = await sharp(buffer).metadata();
	const intrinsicW = meta.width ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
	const intrinsicH = meta.height ?? 0;

	const widths = IMAGE_WIDTHS.filter(w => w <= intrinsicW);
	if (widths.length === 0) widths.push(intrinsicW);

	type EncodeJob = {
		w: number;
		format: 'avif' | 'webp';
		filePath: string;
		quality: number;
	};

	const jobs: EncodeJob[] = [];
	const avifEntries: string[] = [];
	const webpEntries: string[] = [];
	let largestWebp = '';

	for (const w of widths) {
		const avifName = `${hash}.${w}.avif`;
		const webpName = `${hash}.${w}.webp`;
		jobs.push({ w, format: 'avif', filePath: path.join(outDir, avifName), quality: 55 });
		jobs.push({ w, format: 'webp', filePath: path.join(outDir, webpName), quality: 82 });
		const avifUrl = `/hikes/${slug}/${segment}/${avifName}`;
		const webpUrl = `/hikes/${slug}/${segment}/${webpName}`;
		avifEntries.push(`${avifUrl} ${w}w`);
		webpEntries.push(`${webpUrl} ${w}w`);
		largestWebp = webpUrl;
	}

	const thumbName = `${hash}.${IMAGE_THUMBNAIL_WIDTH}.webp`;
	const thumbPath = path.join(outDir, thumbName);
	const thumbUrl = `/hikes/${slug}/${segment}/${thumbName}`;
	const thumbJob: EncodeJob = {
		w: IMAGE_THUMBNAIL_WIDTH,
		format: 'webp',
		filePath: thumbPath,
		quality: 78
	};

	// Filter out jobs whose output already exists — the hash is in the filename,
	// so an existing file is guaranteed to be the same encoded bytes.
	const allJobs = [...jobs, thumbJob];
	const presence = await Promise.all(allJobs.map(j => pathExists(j.filePath)));
	const pending = allJobs.filter((_, i) => !presence[i]);
	const cached = pending.length === 0;

	await Promise.all(
		pending.map(async (job) => {
			const pipeline = sharp(buffer).rotate().resize({ width: job.w, withoutEnlargement: true });
			if (job.format === 'avif') {
				await pipeline.avif({ quality: job.quality }).toFile(job.filePath);
			} else {
				await pipeline.webp({ quality: job.quality }).toFile(job.filePath);
			}
		})
	);

	const largestW = widths[widths.length - 1];
	const scale = largestW / intrinsicW;
	const largestH = Math.round((intrinsicH || largestW) * scale);

	// Names of every output file this image owns — used by the per-hike
	// cleanup pass to drop orphaned encodes from previous builds.
	const outNames = allJobs.map((j) => path.basename(j.filePath));

	return {
		variant: {
			src: largestWebp,
			srcsetAvif: avifEntries.join(', '),
			srcsetWebp: webpEntries.join(', '),
			width: largestW,
			height: largestH,
			alt
		},
		thumbnailRelUrl: thumbUrl,
		largestRelUrl: largestWebp,
		cached,
		outNames
	};
}

// ---------------------------------------------------------------------------
// Explicit card cover (cover.jpg / .jpeg / .png / .webp / .heic / .heif).
// When present it always wins over the "first public route photo" heuristic,
// and unlike route photos it needs no track.gpx waypoint — it's a deliberate
// listing thumbnail. Looked up in `images/` first, then the hike root.
// ---------------------------------------------------------------------------

const COVER_SOURCES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp', 'cover.heic', 'cover.heif'];

async function processCover(
	slug: string,
	imagesDir: string,
	hikeDir: string,
	alt: string
): Promise<{ variant: ImageVariant; outNames: string[] } | undefined> {
	let srcPath: string | undefined;
	for (const dir of [imagesDir, hikeDir]) {
		for (const name of COVER_SOURCES) {
			const p = path.join(dir, name);
			if (await pathExists(p)) {
				srcPath = p;
				break;
			}
		}
		if (srcPath) break;
	}
	if (!srcPath) return undefined;

	const buffer = await fs.readFile(srcPath);
	const hash = shortHashOfBuffer(buffer);
	const enc = await encodeImageVariant(buffer, hash, slug, 'images', alt);
	return { variant: enc.variant, outNames: enc.outNames };
}

// ---------------------------------------------------------------------------
// Per-hike icon (icon.svg / icon.png / icon.jpg / icon.jpeg / icon.webp).
// SVG passes through verbatim; raster sources are re-encoded to a single
// 256-square WebP so /hikes/<slug>/ stays small. Filenames carry the
// source content hash so the URL changes when the icon does, side-stepping
// CDN cache concerns.
// ---------------------------------------------------------------------------

const ICON_SOURCES: ReadonlyArray<{ filename: string; isSvg: boolean }> = [
	{ filename: 'icon.svg', isSvg: true },
	{ filename: 'icon.png', isSvg: false },
	{ filename: 'icon.jpg', isSvg: false },
	{ filename: 'icon.jpeg', isSvg: false },
	{ filename: 'icon.webp', isSvg: false }
];

const ICON_RASTER_SIZE = 256;

async function processIcon(slug: string, hikeDir: string): Promise<{ url: string; outName: string } | undefined> {
	let srcPath: string | undefined;
	let isSvg = false;
	for (const candidate of ICON_SOURCES) {
		const p = path.join(hikeDir, candidate.filename);
		if (await pathExists(p)) {
			srcPath = p;
			isSvg = candidate.isSvg;
			break;
		}
	}
	if (!srcPath) return undefined;

	const buf = await fs.readFile(srcPath);
	const hash = shortHashOfBuffer(buf);
	const outExt = isSvg ? 'svg' : 'webp';
	const outName = `icon.${hash}.${outExt}`;
	// Icons live under the `images/` namespace (alongside encoded photos) so
	// they piggy-back on the same dev-server plugin and nginx public-serve
	// rules. The naming prefix `icon.` keeps them clearly distinct from
	// hash-named photo outputs.
	const outDir = path.join(HIKES_ASSETS_DIR, slug, 'images');
	await fs.mkdir(outDir, { recursive: true });
	const outPath = path.join(outDir, outName);

	if (!(await pathExists(outPath))) {
		if (isSvg) {
			await fs.writeFile(outPath, buf);
		} else {
			await sharp(buf)
				.rotate()
				.resize({ width: ICON_RASTER_SIZE, height: ICON_RASTER_SIZE, fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 88 })
				.toFile(outPath);
		}
	}

	return { url: `/hikes/${slug}/images/${outName}`, outName };
}

// ---------------------------------------------------------------------------
// Pre-rendered hero map (static Swisstopo composite + polyline overlay).
// See `scripts/staticHikeMap.ts` for the renderer; this helper just hashes
// inputs, picks an output filename, and skips when the file already exists.
// ---------------------------------------------------------------------------

// Rendered well beyond any expected viewport width so the image, displayed
// with `object-fit: none`, covers ultrawide / 4K displays without falling
// back to upscale. The bigger canvas surrounds the bbox with extra map
// context — wider viewports just see more of it, narrower viewports see
// less, and the bbox itself is always pixel-aligned with Leaflet's view.
const HERO_WIDTH = 3840;
const HERO_HEIGHT = 2400;
// Zoom-selection reference. Matches the typical desktop hero display size
// (max clamp height = 640 px, full-width up to ~1920 on common monitors)
// so the static image picks the same integer zoom Leaflet's `fitBounds`
// would pick at the live container — meaning the full route is visible on
// the static at every common desktop viewport, no zoom-out animation
// needed once the live map takes over. Narrower viewports still get the
// fly-to-fit animation on top.
const HERO_FIT_WIDTH = 1920;
const HERO_FIT_HEIGHT = 640;
// Per-hike trail colour is picked from the SAC-tier palette in
// `$lib/data/sacColors` at render time — every static hero matches the
// live polyline colour and the overview-map polyline for the same hike,
// so the fade-over from static to interactive looks continuous.
// Photo-badge fill, border + icon-stroke colours per UI theme. Matches
// the live HikeMap's `.hike-photo-marker .badge`:
//   background: var(--color-primary)        → Nord10 light / Nord8 dark
//   border:     var(--color-surface)        → Nord6 light / Nord1 dark
//   color:      var(--color-text-on-primary) → white on the light
//                 theme's mid-blue primary, Nord0 on the dark theme's
//                 light-blue primary (which has too little contrast
//                 against pure white).
const HERO_BADGE_FILL_LIGHT = '#5e81ac';
const HERO_BADGE_FILL_DARK = '#88c0d0';
const HERO_BADGE_BORDER_LIGHT = '#eceff4';
const HERO_BADGE_BORDER_DARK = '#3b4252';
const HERO_BADGE_ICON_LIGHT = '#ffffff';
const HERO_BADGE_ICON_DARK = '#2e3440';
// Bumped whenever the static-map renderer's visual output changes (icons,
// stroke widths, marker shapes, ...) so the per-hike hash invalidates and
// existing files get re-rendered on the next build.
//   v6: per-hike trail colour switched from Nord red to SAC-tier palette.
const HERO_RENDER_VERSION = 6;

// Narrow-viewport variant for phones (≤ 560 px CSS width). Same renderer,
// but the pose is picked for a phone-sized container so the auto-fit zoom
// matches what Leaflet computes there. Canvas stays modest (1200²) since
// the image only needs to cover phone viewports — wider screens fall back
// to the wide hero. `object-fit: none` again pins the centre to the
// container midpoint, so any extra image bleed shows on the edges only.
const HERO_NARROW_WIDTH = 1200;
const HERO_NARROW_HEIGHT = 1200;
// Typical phone hero: ~400 CSS px wide (median portrait phone),
// `clamp(360, 60vh, 640)` ≈ 480 tall on a ~800 px screen. Pick a
// representative square so both detail (60vh) and overview (50vh) heroes
// stay correctly framed across the phone breakpoint range.
const HERO_NARROW_FIT_WIDTH = 400;
const HERO_NARROW_FIT_HEIGHT = 480;

type HeroVariant = 'wide' | 'narrow';

const HERO_VARIANT_SPECS: ReadonlyArray<{
	name: HeroVariant;
	width: number;
	height: number;
	fitWidth: number;
	fitHeight: number;
}> = [
	{
		name: 'wide',
		width: HERO_WIDTH,
		height: HERO_HEIGHT,
		fitWidth: HERO_FIT_WIDTH,
		fitHeight: HERO_FIT_HEIGHT
	},
	{
		name: 'narrow',
		width: HERO_NARROW_WIDTH,
		height: HERO_NARROW_HEIGHT,
		fitWidth: HERO_NARROW_FIT_WIDTH,
		fitHeight: HERO_NARROW_FIT_HEIGHT
	}
];

// Padding + max-zoom match the live overview map's
// `fitBounds(..., { padding: [32, 32], maxZoom: 13 })` so the static lands
// at the same pose Leaflet will fit to. fitHeight matches the page's
// `clamp(320px, 50vh, 520px)` hero at desktop viewports.
const OVERVIEW_FIT_WIDTH = 1920;
const OVERVIEW_FIT_HEIGHT = 520;
const OVERVIEW_PADDING_PX = 32;
const OVERVIEW_MAX_ZOOM = 13;
// Bump alongside `HERO_RENDER_VERSION` (or independently) when the overview
// renderer's output changes — e.g. stroke widths, palette tweaks.
const OVERVIEW_RENDER_VERSION = 1;

type OverviewVariantSpec = {
	name: HeroVariant;
	width: number;
	height: number;
	fitWidth: number;
	fitHeight: number;
};

// Overview narrow uses the same canvas dims as the per-hike narrow but
// fits the union bbox at phone size — same `maxZoom: 13` clamp as the
// live map's `fitBounds`.
const OVERVIEW_VARIANT_SPECS: ReadonlyArray<OverviewVariantSpec> = [
	{ name: 'wide', width: HERO_WIDTH, height: HERO_HEIGHT, fitWidth: OVERVIEW_FIT_WIDTH, fitHeight: OVERVIEW_FIT_HEIGHT },
	{ name: 'narrow', width: HERO_NARROW_WIDTH, height: HERO_NARROW_HEIGHT, fitWidth: HERO_NARROW_FIT_WIDTH, fitHeight: HERO_NARROW_FIT_HEIGHT }
];

type OverviewVariantResult = {
	url: string;
	zoom: number;
	center: [number, number];
	outName: string;
};

async function processOverview(
	hikes: HikeManifestEntry[]
): Promise<HikesOverview | undefined> {
	const lines = hikes
		.filter((h) => h.previewPolyline && h.previewPolyline.length >= 2)
		.map((h) => ({
			points: h.previewPolyline,
			color: SAC_TRAIL_COLOR[h.difficulty] ?? '#5e81ac',
			breaks: h.previewBreaks
		}));
	if (lines.length === 0) return undefined;

	// Union bbox over every hike's bbox — that's what Leaflet's
	// `fitBounds(bounds)` operates on with `extend()` per polyline. Using
	// each hike's bbox rather than every polyline point keeps the math
	// cheap without losing the framing accuracy.
	let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
	for (const h of hikes) {
		const [a, b, c, d] = h.bbox;
		if (a < minLat) minLat = a;
		if (c > maxLat) maxLat = c;
		if (b < minLng) minLng = b;
		if (d > maxLng) maxLng = d;
	}
	if (!Number.isFinite(minLat)) return undefined;
	const bbox: [number, number, number, number] = [minLat, minLng, maxLat, maxLng];

	const slug = '_overview';
	const outDir = path.join(HIKES_ASSETS_DIR, slug, 'images');
	await fs.mkdir(outDir, { recursive: true });

	async function renderVariant(spec: OverviewVariantSpec): Promise<OverviewVariantResult | undefined> {
		const pose = computeStaticMapPose({
			bbox,
			width: spec.width,
			height: spec.height,
			paddingPx: OVERVIEW_PADDING_PX,
			fitWidth: spec.fitWidth,
			fitHeight: spec.fitHeight,
			maxZoom: OVERVIEW_MAX_ZOOM
		});
		if (!pose) return undefined;

		const hash = crypto
			.createHash('sha256')
			.update(
				JSON.stringify({
					bbox,
					w: spec.width,
					h: spec.height,
					fw: spec.fitWidth,
					fh: spec.fitHeight,
					lines,
					maxZoom: OVERVIEW_MAX_ZOOM,
					pad: OVERVIEW_PADDING_PX,
					v: OVERVIEW_RENDER_VERSION
				})
			)
			.digest('hex')
			.slice(0, 8);

		// `wide` keeps the historical `overview.<hash>.webp` filename to
		// preserve existing caches.
		const outName = spec.name === 'wide' ? `overview.${hash}.webp` : `overview-${spec.name}.${hash}.webp`;
		const outPath = path.join(outDir, outName);

		const renderT0 = Date.now();
		console.log(
			`[build-hikes:_overview]   ${spec.name}: ${lines.length} polylines · zoom ${pose.zoom} · ` +
				`${Math.round(spec.width / 256)}×${Math.round(spec.height / 256)} tile grid`
		);
		if (!(await pathExists(outPath))) {
			const ok = await renderOverviewMap({
				pose,
				polylines: lines,
				outputPath: outPath,
				width: spec.width,
				height: spec.height
			});
			if (!ok) {
				console.warn(`[build-hikes:_overview]   ${spec.name} render failed — too few tiles fetched`);
				return undefined;
			}
			console.log(`[build-hikes:_overview]   ${spec.name} rendered ${outName} in ${Date.now() - renderT0}ms`);
		} else {
			console.log(`[build-hikes:_overview]   ${spec.name} cached (${outName})`);
		}

		return {
			url: `/hikes/${slug}/images/${outName}`,
			zoom: pose.zoom,
			center: [pose.centerLat, pose.centerLng],
			outName
		};
	}

	const results = await Promise.all(OVERVIEW_VARIANT_SPECS.map(renderVariant));
	const byVariant: Partial<Record<HeroVariant, OverviewVariantResult>> = {};
	for (let i = 0; i < OVERVIEW_VARIANT_SPECS.length; i++) {
		const r = results[i];
		if (r) byVariant[OVERVIEW_VARIANT_SPECS[i].name] = r;
	}
	if (!byVariant.wide) return undefined;

	// Sweep orphan overview heroes from previous builds. Keep both wide
	// and narrow outNames if present.
	const keep = new Set<string>();
	for (const r of Object.values(byVariant)) {
		if (r) keep.add(r.outName);
	}
	try {
		const existing = await fs.readdir(outDir);
		const orphans = existing.filter((f) => !keep.has(f));
		if (orphans.length > 0) {
			await Promise.all(orphans.map((f) => fs.unlink(path.join(outDir, f)).catch(() => {})));
			console.log(`[build-hikes:_overview]   removed ${orphans.length} orphaned file(s)`);
		}
	} catch {
		// dir didn't exist before this run
	}

	return {
		url: byVariant.wide.url,
		zoom: byVariant.wide.zoom,
		center: byVariant.wide.center,
		urlNarrow: byVariant.narrow?.url,
		zoomNarrow: byVariant.narrow?.zoom,
		centerNarrow: byVariant.narrow?.center
	};
}

type HeroVariantResult = {
	lightUrl: string;
	lightOutName: string;
	darkUrl: string;
	darkOutName: string;
	zoom: number;
	center: [number, number];
};

async function processHero(
	slug: string,
	track: GpxPoint[],
	bbox: [number, number, number, number],
	imagePoints: ImagePoint[],
	difficulty: Difficulty
): Promise<Partial<Record<HeroVariant, HeroVariantResult>> | undefined> {
	if (track.length < 2) return undefined;

	const trailColor = sacTrailColor(difficulty);
	const polyline: Array<[number, number]> = track.map((p) => [p.lat, p.lng]);
	// Public photo markers only — the hero is rendered once and served to
	// everyone, including logged-out viewers, so private positions must
	// not be burned in.
	const photoMarkers = imagePoints
		.filter((ip) => ip.visibility !== 'private')
		.map((ip) => ({ lat: ip.lat, lng: ip.lng }));

	const outDir = path.join(HIKES_ASSETS_DIR, slug, 'images');
	await fs.mkdir(outDir, { recursive: true });

	// One pose per viewport variant — narrow uses a phone-sized fit so the
	// chosen integer zoom matches what Leaflet picks at the same container
	// size, eliminating the visible "the static is too zoomed in" mismatch
	// the user sees with only a desktop-sized pose.
	async function renderForViewport(
		spec: (typeof HERO_VARIANT_SPECS)[number]
	): Promise<HeroVariantResult | undefined> {
		const pose = computeStaticMapPose({
			bbox,
			width: spec.width,
			height: spec.height,
			fitWidth: spec.fitWidth,
			fitHeight: spec.fitHeight
		});
		if (!pose) return undefined;

		async function renderTheme(theme: 'light' | 'dark'): Promise<{ url: string; outName: string } | undefined> {
			const fillColor = theme === 'dark' ? HERO_BADGE_FILL_DARK : HERO_BADGE_FILL_LIGHT;
			const borderColor = theme === 'dark' ? HERO_BADGE_BORDER_DARK : HERO_BADGE_BORDER_LIGHT;
			const iconColor = theme === 'dark' ? HERO_BADGE_ICON_DARK : HERO_BADGE_ICON_LIGHT;
			const hash = crypto
				.createHash('sha256')
				.update(
					JSON.stringify({
						bbox,
						w: spec.width,
						h: spec.height,
						fw: spec.fitWidth,
						fh: spec.fitHeight,
						color: trailColor,
						poly: polyline,
						photos: photoMarkers,
						fill: fillColor,
						border: borderColor,
						icon: iconColor,
						v: HERO_RENDER_VERSION
					})
				)
				.digest('hex')
				.slice(0, 8);

			// `wide` keeps the historical `hero-{theme}.<hash>.webp` filename
			// so existing on-disk caches survive the variant split.
			const prefix = spec.name === 'wide' ? `hero-${theme}` : `hero-${spec.name}-${theme}`;
			const outName = `${prefix}.${hash}.webp`;
			const outPath = path.join(outDir, outName);

			if (!(await pathExists(outPath))) {
				const ok = await renderStaticMap({
					pose,
					polyline,
					color: trailColor,
					outputPath: outPath,
					width: spec.width,
					height: spec.height,
					photoMarkers,
					photoMarkerColor: fillColor,
					photoMarkerBorderColor: borderColor,
					photoMarkerIconColor: iconColor
				});
				if (!ok) return undefined;
			}

			return { url: `/hikes/${slug}/images/${outName}`, outName };
		}

		const [light, dark] = await Promise.all([renderTheme('light'), renderTheme('dark')]);
		if (!light || !dark) return undefined;

		return {
			lightUrl: light.url,
			lightOutName: light.outName,
			darkUrl: dark.url,
			darkOutName: dark.outName,
			zoom: pose.zoom,
			center: [pose.centerLat, pose.centerLng]
		};
	}

	const variants = await Promise.all(HERO_VARIANT_SPECS.map(renderForViewport));
	const out: Partial<Record<HeroVariant, HeroVariantResult>> = {};
	for (let i = 0; i < HERO_VARIANT_SPECS.length; i++) {
		const v = variants[i];
		if (v) out[HERO_VARIANT_SPECS[i].name] = v;
	}
	// At minimum we need the wide variant — that's what desktop falls back
	// to, and CLS-reservation on the page expects it. Narrow is best-effort.
	if (!out.wide) return undefined;
	return out;
}

// ---------------------------------------------------------------------------
// Image EXIF -> ImagePoint
// ---------------------------------------------------------------------------

function extractImagePoint(
	processed: { thumbnailRelUrl: string; largestRelUrl: string; hash: string },
	alt: string,
	gpxImageRef: GpxImageRef
): ImagePoint {
	// The GPX `<bocken:image hash>` waypoint is the single source of truth
	// for an image's position. Authors place images on the route via the
	// route-builder (or by hand in the GPX); EXIF GPS is no longer trusted
	// as a fallback because phone GPS noise produced visible spikes and
	// because users sometimes want to publish an image at a corrected
	// location.
	return {
		src: processed.largestRelUrl,
		thumbnail: processed.thumbnailRelUrl,
		lat: gpxImageRef.lat,
		lng: gpxImageRef.lng,
		altitude: gpxImageRef.altitude,
		timestamp: gpxImageRef.timestamp,
		alt,
		visibility: gpxImageRef.visibility ?? 'public'
	};
}

// ---------------------------------------------------------------------------
// Per-hike build
// ---------------------------------------------------------------------------

async function buildHike(slug: string, cache: GeocodeCache): Promise<HikeManifestEntry | null> {
	const hikeStart = Date.now();
	const hikeDir = path.join(CONTENT_DIR, slug);
	const svxPath = path.join(hikeDir, 'index.svx');
	const gpxPath = path.join(hikeDir, 'track.gpx');
	const imagesDir = path.join(hikeDir, 'images');

	let svxSource: string;
	try {
		svxSource = await fs.readFile(svxPath, 'utf-8');
	} catch {
		console.warn(`[build-hikes] Skipping ${slug}: no index.svx`);
		return null;
	}

	let gpxSource: string;
	try {
		gpxSource = await fs.readFile(gpxPath, 'utf-8');
	} catch {
		console.warn(`[build-hikes] Skipping ${slug}: no track.gpx`);
		return null;
	}

	const { data: fm } = parseFrontmatter(svxSource);
	// One stage per <trk>. The flat track is their concatenation — identical to
	// the old `parseGpx` output for single-track GPX, so everything downstream
	// (track JSON, hero map, images) is unchanged for normal hikes.
	const gpxStages = parseGpxStages(gpxSource);
	const track: GpxPoint[] = gpxStages.flatMap((s) => s.points);
	if (track.length === 0) {
		console.warn(`[build-hikes] Skipping ${slug}: empty GPX`);
		return null;
	}
	const gpxImageRefs = parseGpxImageRefs(gpxSource);
	const gpxImageCount = Object.keys(gpxImageRefs).length;
	console.log(`[build-hikes:${slug}]   parsed GPX (${track.length} track pts, ${gpxStages.length} stage(s), ${gpxImageCount} image refs)`);

	// Privacy: anonymise absolute clock times. Re-base every timestamp so the
	// hike starts at 08:00 "today" while preserving all relative offsets
	// (total duration, per-stage gaps, photo "nach X"). This single shift flows
	// into the published track JSON, the page metrics, and the client-built GPX
	// download — all of which read these timestamps — so the real recording
	// times never leave the private source GPX. Track points are shared with
	// `gpxStages` (flatMap keeps object identity), so stages rebase too.
	{
		let firstTs: number | null = null;
		for (const p of track) {
			if (typeof p.timestamp === 'number') {
				firstTs = p.timestamp;
				break;
			}
		}
		if (firstTs !== null) {
			const anchor = new Date();
			anchor.setHours(8, 0, 0, 0);
			const offset = anchor.getTime() - firstTs;
			for (const p of track) {
				if (typeof p.timestamp === 'number') p.timestamp += offset;
			}
			for (const ref of Object.values(gpxImageRefs)) {
				if (typeof ref.timestamp === 'number') ref.timestamp += offset;
			}
		}
	}

	// Per-stage stats + flat-track index ranges. Indices are contiguous and
	// disjoint (endIdx + 1 === next.startIdx).
	const stageEntries: HikeStage[] = [];
	{
		let offset = 0;
		for (const s of gpxStages) {
			const startIdx = offset;
			const endIdx = offset + s.points.length - 1;
			offset = endIdx + 1;
			const range = computeElevationRange(s.points);
			const { gain: sGain, loss: sLoss } = computeElevationStats(s.points);
			const sDtMs = s.points[s.points.length - 1].timestamp - s.points[0].timestamp;
			stageEntries.push({
				name: s.name ?? `Etappe ${stageEntries.length + 1}`,
				startIdx,
				endIdx,
				distanceKm: trackDistance(s.points),
				durationMin: sDtMs > 0 ? Math.round(sDtMs / 60000) : null,
				elevationGainM: sGain,
				elevationLossM: sLoss,
				elevationMaxM: range.max,
				elevationMinM: range.min
			});
		}
	}
	const multiStage = stageEntries.length >= 2;

	// Totals: summed per-stage when multi-day, so overnight horizontal gaps
	// (distance) and time gaps (duration) and the altitude jump between a
	// stage's end and the next stage's start (gain/loss) are all excluded.
	let distanceKm: number;
	let gain: number;
	let loss: number;
	let durationMin: number | null;
	let elevationMinM: number | null;
	let elevationMaxM: number | null;
	if (multiStage) {
		distanceKm = stageEntries.reduce((a, s) => a + s.distanceKm, 0);
		gain = stageEntries.reduce((a, s) => a + s.elevationGainM, 0);
		loss = stageEntries.reduce((a, s) => a + s.elevationLossM, 0);
		const durs = stageEntries.map((s) => s.durationMin).filter((d): d is number => d != null);
		durationMin = durs.length > 0 ? durs.reduce((a, d) => a + d, 0) : null;
		const mins = stageEntries.map((s) => s.elevationMinM).filter((v): v is number => v != null);
		const maxs = stageEntries.map((s) => s.elevationMaxM).filter((v): v is number => v != null);
		elevationMinM = mins.length > 0 ? Math.min(...mins) : null;
		elevationMaxM = maxs.length > 0 ? Math.max(...maxs) : null;
	} else {
		distanceKm = trackDistance(track);
		({ gain, loss } = computeElevationStats(track));
		({ min: elevationMinM, max: elevationMaxM } = computeElevationRange(track));
		const dtMs = track[track.length - 1].timestamp - track[0].timestamp;
		durationMin = dtMs > 0 ? Math.round(dtMs / 60000) : null;
	}

	const { bbox, centroid } = computeBboxAndCentroid(track);
	const { previewPolyline, previewBreaks } = buildPreview(gpxStages);
	console.log(`[build-hikes:${slug}]   metrics: ${distanceKm.toFixed(2)} km · ↑${gain}m / ↓${loss}m · ${elevationMinM ?? '?'}–${elevationMaxM ?? '?'}m · ${durationMin ?? '?'} min`);

	const geoT0 = Date.now();
	const geo = await reverseGeocode(centroid[0], centroid[1], cache);
	console.log(`[build-hikes:${slug}]   geocode: ${geo.municipality ?? '–'}, ${geo.canton ?? '–'} (${Date.now() - geoT0}ms)`);

	// Process images
	const imageFiles: string[] = [];
	try {
		const entries = await fs.readdir(imagesDir);
		for (const e of entries.sort()) {
			// `cover.*` is the explicit listing thumbnail — handled by processCover,
			// never a route/strip photo (and doesn't need a track.gpx waypoint).
			if (/^cover\.(jpe?g|png|webp|heic|heif)$/i.test(e)) continue;
			if (/\.(jpe?g|png|webp|heic|heif)$/i.test(e)) imageFiles.push(path.join(imagesDir, e));
		}
	} catch {
		// no images dir is fine
	}
	// Images whose content hash isn't in gpxImageRefs are dropped before
	// encoding (see processImage). Count for the log line below.
	if (imageFiles.length > 0) {
		console.log(
			`[build-hikes:${slug}]   processing ${imageFiles.length} image(s) — ${Object.keys(gpxImageRefs).length} referenced in track.gpx (concurrency=${IMAGE_CONCURRENCY})…`
		);
	}

	let cover: ImageVariant | null = null;
	const imagePoints: ImagePoint[] = [];
	// Filenames produced by this build, keyed by segment dir (`images` /
	// `private`). Used to delete leftover encoded files from previous runs
	// (images that have since been unreferenced or moved between visibilities).
	const keepFiles: Record<'images' | 'private', Set<string>> = {
		images: new Set(),
		private: new Set()
	};

	type ImageResult = {
		variant: ImageVariant | null;
		point: ImagePoint | null;
		outNames: string[];
		visibility: 'public' | 'private';
	};

	const results = await runWithConcurrency<string, ImageResult>(
		imageFiles,
		IMAGE_CONCURRENCY,
		async (imgPath, i) => {
			const imgT0 = Date.now();
			// Hero alt only applies to the first image; later ones get a generic
			// label (image basenames usually encode date/camera info that we don't
			// want to leak into alt text or hover tooltips).
			const alt = i === 0 && typeof fm.heroAlt === 'string'
				? fm.heroAlt
				: `Bild ${i + 1}`;
			const processed = await processImage(imgPath, slug, alt, gpxImageRefs);
			if ('skipped' in processed) {
				console.log(
					`[build-hikes:${slug}]     [${i + 1}/${imageFiles.length}] ${path.basename(imgPath)} · ${processed.hash} · skipped (not in track.gpx)`
				);
				return { variant: null, point: null, outNames: [], visibility: 'public' as const };
			}
			const point = extractImagePoint(processed, alt, gpxImageRefs[processed.hash]);
			const cacheTag = processed.cached ? ' · cached' : '';
			console.log(
				`[build-hikes:${slug}]     [${i + 1}/${imageFiles.length}] ${path.basename(imgPath)} · ${processed.hash} · ${processed.visibility}${cacheTag} (${Date.now() - imgT0}ms)`
			);
			return {
				variant: processed.variant,
				point,
				outNames: processed.outNames,
				visibility: processed.visibility
			};
		}
	);

	for (const r of results) {
		if (r.variant !== null) {
			// Fallback cover when there's no explicit `cover.*`: the first PUBLIC
			// route photo. Private images must not surface on the listing page
			// (prerendered, served to anonymous viewers). An explicit cover.*
			// overrides this below.
			if (cover === null && r.visibility === 'public') cover = r.variant;
			const segment = r.visibility === 'private' ? 'private' : 'images';
			for (const name of r.outNames) keepFiles[segment].add(name);
		}
		if (r.point) imagePoints.push(r.point);
	}

	// Difficulty is hoisted from the manifest assembly below because the
	// hero renderer needs it to pick the SAC-tier trail colour.
	const difficulty = (typeof fm.difficulty === 'string' && VALID_DIFFICULTIES.includes(fm.difficulty as Difficulty))
		? (fm.difficulty as Difficulty)
		: 'T1';

	// Per-route icon + pre-rendered hero map + explicit cover — handled here
	// (before cleanup) so their outNames join `keepFiles.images` and survive the
	// orphan sweep, while previous-build `icon.<oldhash>.*` / `hero.<oldhash>.*`
	// files (different hash, not in keepFiles) get removed automatically.
	const coverAlt =
		typeof fm.heroAlt === 'string'
			? fm.heroAlt
			: typeof fm.title === 'string'
				? fm.title
				: 'Titelbild';
	const [iconResult, heroResult, coverResult] = await Promise.all([
		processIcon(slug, hikeDir),
		processHero(slug, track, bbox, imagePoints, difficulty),
		processCover(slug, imagesDir, hikeDir, coverAlt)
	]);
	if (iconResult) keepFiles.images.add(iconResult.outName);
	if (heroResult) {
		for (const v of Object.values(heroResult)) {
			if (!v) continue;
			keepFiles.images.add(v.lightOutName);
			keepFiles.images.add(v.darkOutName);
		}
	}
	// An explicit cover.* always wins over the first-public-photo fallback.
	if (coverResult) {
		cover = coverResult.variant;
		for (const name of coverResult.outNames) keepFiles.images.add(name);
	}

	// Cleanup pass: drop any encoded files in either segment dir that don't
	// belong to a current image. Catches both stale hashes (deleted source
	// images) and visibility flips (a hash that's now public still has its
	// old `private/` encodes lying around, and vice versa).
	for (const segment of ['images', 'private'] as const) {
		const dir = path.join(HIKES_ASSETS_DIR, slug, segment);
		try {
			const existing = await fs.readdir(dir);
			const keep = keepFiles[segment];
			const orphans = existing.filter((f) => !keep.has(f));
			if (orphans.length > 0) {
				await Promise.all(
					orphans.map((f) => fs.unlink(path.join(dir, f)).catch(() => {}))
				);
				console.log(
					`[build-hikes:${slug}]   removed ${orphans.length} orphaned ${segment}/ file(s) from prior builds`
				);
			}
		} catch {
			// Dir may not exist when a hike has no images of this visibility — nothing to clean.
		}
	}

	if (!cover) {
		// Synthetic 1x1 placeholder so the manifest type stays satisfied even
		// when a hike directory has no images yet.
		cover = {
			src: '',
			srcsetAvif: '',
			srcsetWebp: '',
			width: 0,
			height: 0,
			alt: ''
		};
	}

	// Per-hike full track JSON in compact tuple format
	const tuples = track.map(p => [
		Number(p.lng.toFixed(6)),
		Number(p.lat.toFixed(6)),
		typeof p.altitude === 'number' ? Number(p.altitude.toFixed(1)) : null,
		p.timestamp
	]);
	const trackJson = JSON.stringify(tuples);
	const trackHash = crypto.createHash('sha256').update(trackJson).digest('hex').slice(0, 8);
	const trackFile = path.join(STATIC_DIR, slug, `track.${trackHash}.json`);
	await fs.mkdir(path.dirname(trackFile), { recursive: true });
	await fs.writeFile(trackFile, trackJson);
	console.log(`[build-hikes:${slug}]   wrote track.${trackHash}.json (${trackJson.length} bytes)`);

	// Sweep stale track.*.json from earlier builds. Without this the previous
	// file lingers in static/ and ships on deploy — and since timestamps are
	// now anonymised, an old file would still expose the real recording times
	// at its (guessable) URL.
	{
		const dir = path.dirname(trackFile);
		const keep = path.basename(trackFile);
		const stale = (await fs.readdir(dir)).filter(
			(f) => /^track\..*\.json$/.test(f) && f !== keep
		);
		await Promise.all(stale.map((f) => fs.unlink(path.join(dir, f)).catch(() => {})));
		if (stale.length > 0) {
			console.log(`[build-hikes:${slug}]   removed ${stale.length} stale track JSON(s)`);
		}
	}

	const date = typeof fm.date === 'string'
		? fm.date
		: (typeof fm.date === 'number' ? new Date(fm.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

	const tags = Array.isArray(fm.tags) ? fm.tags : [];

	const iconUrl = iconResult?.url;
	const heroWide = heroResult?.wide;
	const heroNarrow = heroResult?.narrow;
	const heroMapUrlLight = heroWide?.lightUrl;
	const heroMapUrlDark = heroWide?.darkUrl;
	const heroMapZoom = heroWide?.zoom;
	const heroMapCenter = heroWide?.center;
	const heroMapUrlLightNarrow = heroNarrow?.lightUrl;
	const heroMapUrlDarkNarrow = heroNarrow?.darkUrl;
	const heroMapZoomNarrow = heroNarrow?.zoom;
	const heroMapCenterNarrow = heroNarrow?.center;

	const entry: HikeManifestEntry = {
		slug,
		title: typeof fm.title === 'string' ? fm.title : slug,
		date,
		summary: typeof fm.summary === 'string' ? fm.summary : '',
		author: typeof fm.author === 'string' ? fm.author : undefined,
		tags,
		difficulty,
		hidden: fm.hidden === true,
		...parseSeasonRange(fm.seasons),
		distanceKm: Math.round(distanceKm * 100) / 100,
		durationMin,
		elevationGainM: gain,
		elevationLossM: loss,
		elevationMaxM,
		elevationMinM,
		bbox,
		centroid,
		previewPolyline,
		...(previewBreaks.length > 0 ? { previewBreaks } : {}),
		...(multiStage ? { stages: stageEntries } : {}),
		region: geo.region,
		canton: geo.canton,
		municipality: geo.municipality,
		country: geo.country,
		trackUrl: `/hikes/${slug}/track.${trackHash}.json`,
		pointCount: track.length,
		cover,
		icon: iconUrl,
		heroMapUrlLight,
		heroMapUrlDark,
		heroMapZoom,
		heroMapCenter,
		heroMapUrlLightNarrow,
		heroMapUrlDarkNarrow,
		heroMapZoomNarrow,
		heroMapCenterNarrow,
		imagePoints
	};

	console.log(`[build-hikes:${slug}]   done in ${((Date.now() - hikeStart) / 1000).toFixed(1)}s`);
	return entry;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
	let slugs: string[] = [];
	try {
		const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
		slugs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
	} catch {
		console.warn(`[build-hikes] No content dir at ${CONTENT_DIR}; emitting empty manifest.`);
	}

	const cache = await loadGeocodeCache();
	const hikes: HikeManifestEntry[] = [];

	for (const slug of slugs) {
		console.log(`[build-hikes] Building ${slug}`);
		const entry = await buildHike(slug, cache);
		if (entry) hikes.push(entry);
	}

	// Sweep whole orphan slug dirs from static/ — e.g. a renamed or deleted
	// hike. Otherwise its old per-slug track JSON (with the real, un-anonymised
	// recording times) keeps shipping at a guessable URL. Keep current content
	// slugs and any special "_*" entry (e.g. the overview hero). Guarded by a
	// non-empty slug list so a failed content read never wipes everything.
	if (slugs.length > 0) {
		try {
			const keep = new Set(slugs);
			const present = await fs.readdir(STATIC_DIR, { withFileTypes: true });
			const orphans = present.filter(
				(e) => e.isDirectory() && !e.name.startsWith('_') && !keep.has(e.name)
			);
			await Promise.all(
				orphans.map((e) => fs.rm(path.join(STATIC_DIR, e.name), { recursive: true, force: true }))
			);
			if (orphans.length > 0) {
				console.log(
					`[build-hikes] removed ${orphans.length} orphan slug dir(s) from static/: ${orphans.map((o) => o.name).join(', ')}`
				);
			}
		} catch {
			// static/hikes may not exist yet on a clean checkout — nothing to sweep.
		}
	}

	await saveGeocodeCache(cache);

	hikes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

	// Build the overview hero from the listing-visible set (matches what
	// `/hikes` shows: hidden hikes are filtered out by the page loader).
	const overview = await processOverview(hikes.filter((h) => !h.hidden));

	await fs.mkdir(path.dirname(MANIFEST_OUT), { recursive: true });
	const banner =
		'// AUTO-GENERATED by scripts/build-hikes.ts — do not edit by hand.\n' +
		"import type { HikeManifestEntry, HikesOverview } from '$types/hikes';\n\n";
	const body =
		`export const HIKES: HikeManifestEntry[] = ${JSON.stringify(hikes, null, 2)} as const;\n\n` +
		`export const HIKES_OVERVIEW: HikesOverview | null = ${JSON.stringify(overview ?? null, null, 2)};\n`;
	const manifestSrc = banner + body;
	await fs.writeFile(MANIFEST_OUT, manifestSrc);

	const bytes = Buffer.byteLength(manifestSrc, 'utf-8');
	if (bytes > MANIFEST_WARN_BYTES) {
		console.warn(`[build-hikes] Manifest ${bytes} bytes exceeds soft cap ${MANIFEST_WARN_BYTES} — consider trimming previewPolyline size.`);
	}

	console.log(`[build-hikes] Wrote ${hikes.length} hikes to ${MANIFEST_OUT} (${bytes} bytes)`);
}

main().catch(err => {
	console.error('[build-hikes] Fatal:', err);
	process.exit(1);
});
