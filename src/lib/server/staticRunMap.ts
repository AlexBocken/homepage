/**
 * Runtime static-map renderer for GPS-tracked workouts.
 *
 * Mirrors the build-time hike hero renderer (scripts/staticHikeMap.ts) but is
 * safe to run per-request on the server: it fetches tiles through our own
 * caching tile proxy (maps.bocken.org) — never the upstream providers — and
 * returns a WebP buffer instead of writing a build artifact. WebP only; we
 * deliberately skip AVIF here because libaom encoding is far too slow for a
 * request path.
 *
 * The output is generated once per run and cached on disk by the caller
 * (see runMapImage.ts), so this only does real work on a cache miss.
 */
import sharp from 'sharp';
import { TILE_BASE, ROUTE_COLOR, ROUTE_CASING } from '$lib/data/mapTiles';

const TILE_SIZE = 256;
const TILE_LAYER = 'karte'; // proxy's schematic/topographic layer
const USER_AGENT = 'bocken-homepage run-map';

// Small in-process LRU so a burst of renders for nearby runs reuses tiles
// without re-hitting the proxy. The proxy caches too; this just trims chatter.
const TILE_CACHE = new Map<string, Buffer>();
const TILE_CACHE_MAX = 512;

/** Web Mercator: lng/lat → absolute pixel coordinate at a given zoom. */
function lngLatToPx(lng: number, lat: number, zoom: number): { x: number; y: number } {
	const n = 2 ** zoom;
	const x = ((lng + 180) / 360) * n * TILE_SIZE;
	const latRad = (lat * Math.PI) / 180;
	const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE;
	return { x, y };
}

function tileCacheGet(key: string): Buffer | undefined {
	const buf = TILE_CACHE.get(key);
	if (buf) {
		// Refresh LRU recency.
		TILE_CACHE.delete(key);
		TILE_CACHE.set(key, buf);
	}
	return buf;
}

function tileCacheSet(key: string, buf: Buffer): void {
	if (TILE_CACHE.size >= TILE_CACHE_MAX) {
		const oldest = TILE_CACHE.keys().next().value;
		if (oldest !== undefined) TILE_CACHE.delete(oldest);
	}
	TILE_CACHE.set(key, buf);
}

/** `null` = fetch failed; counts against the abort threshold. */
async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
	const n = 2 ** z;
	// Wrap x, drop out-of-range y.
	const wrappedX = ((x % n) + n) % n;
	if (y < 0 || y >= n) return null;

	const key = `${z}/${wrappedX}/${y}`;
	const cached = tileCacheGet(key);
	if (cached) return cached;

	try {
		const res = await fetch(`${TILE_BASE}/${TILE_LAYER}/${z}/${wrappedX}/${y}`, {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		tileCacheSet(key, buf);
		return buf;
	} catch {
		return null;
	}
}

function fmt(n: number): string {
	return n.toFixed(1);
}

export interface RenderRunMapOpts {
	/** Route polyline as `[lat, lng]` tuples. */
	track: Array<[number, number]>;
	width?: number;
	height?: number;
	paddingPx?: number;
	maxZoom?: number;
	/** Route stroke colour. Defaults to the high-contrast red route colour. */
	color?: string;
}

/**
 * Render the route over a map and return a WebP buffer, or `null` if the
 * track is degenerate or too many tiles failed to load.
 */
export async function renderRunMap(opts: RenderRunMapOpts): Promise<Buffer | null> {
	const png = await buildRouteMapPng(opts);
	if (!png) return null;
	return sharp(png.buffer).webp({ quality: 80 }).toBuffer();
}

/**
 * Builds the base map PNG with the route drawn on it (tiles + white-cased
 * route + start/end dots). Returns the buffer plus the canvas dimensions, or
 * null on degenerate input / too many tile failures. Shared by the bare map
 * image and the share card.
 */
async function buildRouteMapPng(
	opts: RenderRunMapOpts
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
	const width = opts.width ?? 1200;
	const height = opts.height ?? 630;
	const paddingPx = opts.paddingPx ?? 48;
	const maxZoom = opts.maxZoom ?? 16;
	const color = opts.color ?? ROUTE_COLOR;
	const track = opts.track;

	if (track.length < 2) return null;

	let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
	for (const [lat, lng] of track) {
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
	}
	if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;

	const innerW = Math.max(1, width - 2 * paddingPx);
	const innerH = Math.max(1, height - 2 * paddingPx);

	// Highest integer zoom where the bbox fits inside the padded canvas —
	// mirrors Leaflet's fitBounds integer-zoom search.
	let zoom = 3;
	for (let z = maxZoom; z >= 3; z--) {
		const tl = lngLatToPx(minLng, maxLat, z);
		const br = lngLatToPx(maxLng, minLat, z);
		if (br.x - tl.x <= innerW && br.y - tl.y <= innerH) {
			zoom = z;
			break;
		}
	}

	const centerLng = (minLng + maxLng) / 2;
	const centerLat = (minLat + maxLat) / 2;
	const c = lngLatToPx(centerLng, centerLat, zoom);
	const originX = Math.round(c.x - width / 2);
	const originY = Math.round(c.y - height / 2);

	// Composite every tile covering the canvas.
	const minTileX = Math.floor(originX / TILE_SIZE);
	const maxTileX = Math.floor((originX + width - 1) / TILE_SIZE);
	const minTileY = Math.floor(originY / TILE_SIZE);
	const maxTileY = Math.floor((originY + height - 1) / TILE_SIZE);

	const jobs: Array<{ tx: number; ty: number; left: number; top: number }> = [];
	for (let ty = minTileY; ty <= maxTileY; ty++) {
		for (let tx = minTileX; tx <= maxTileX; tx++) {
			jobs.push({ tx, ty, left: tx * TILE_SIZE - originX, top: ty * TILE_SIZE - originY });
		}
	}

	const results = await Promise.all(
		jobs.map(async (job) => ({ job, buf: await fetchTile(zoom, job.tx, job.ty) }))
	);

	const composites: Array<{ input: Buffer; left: number; top: number }> = [];
	let failures = 0;
	for (const { job, buf } of results) {
		if (!buf) {
			failures++;
			continue;
		}
		composites.push({ input: buf, left: job.left, top: job.top });
	}
	// A patchy map is worse than falling back to the SVG outline.
	if (failures > jobs.length / 2 || composites.length === 0) return null;

	const base = await sharp({
		create: { width, height, channels: 3, background: { r: 235, g: 235, b: 235 } }
	})
		.composite(composites)
		.png()
		.toBuffer();

	// SVG overlay: route polyline + start (green) / end (red) dots.
	const parts: string[] = [];
	for (let i = 0; i < track.length; i++) {
		const [lat, lng] = track[i];
		const p = lngLatToPx(lng, lat, zoom);
		parts.push((i === 0 ? 'M' : 'L') + fmt(p.x - originX) + ',' + fmt(p.y - originY));
	}
	const s = lngLatToPx(track[0][1], track[0][0], zoom);
	const e = lngLatToPx(track[track.length - 1][1], track[track.length - 1][0], zoom);
	const d = parts.join(' ');
	const overlay = Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
			// White casing under the route for high contrast on any map surface.
			`<path d="${d}" fill="none" stroke="${ROUTE_CASING}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/>` +
			`<path d="${d}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
			`<circle cx="${fmt(s.x - originX)}" cy="${fmt(s.y - originY)}" r="10" fill="#a3be8c" stroke="#fff" stroke-width="3"/>` +
			`<circle cx="${fmt(e.x - originX)}" cy="${fmt(e.y - originY)}" r="10" fill="#bf616a" stroke="#fff" stroke-width="3"/>` +
			`</svg>`
	);

	const buffer = await sharp(base)
		.composite([{ input: overlay, left: 0, top: 0 }])
		.png()
		.toBuffer();
	return { buffer, width, height };
}

function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (ch) =>
		ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&apos;'
	);
}

export interface RunCardStat {
	value: string;
	label: string;
}

export interface RenderRunCardOpts extends RenderRunMapOpts {
	/** Run title (e.g. the session name). */
	title: string;
	/** Secondary line under the title (e.g. the date). */
	subtitle?: string;
	/** Up to ~4 stat columns shown along the bottom band. */
	stats: RunCardStat[];
}

const FONT = 'font-family="Helvetica, Arial, sans-serif"';

// Lucide icons (24×24, stroke) used as the backdrop watermark on the non-map
// share cards: `dumbbell` (same as the fitness header) for strength, and
// `footprints` for GPS-less cardio (e.g. a manually logged run).
const BACKDROP_ICONS: Record<string, string[]> = {
	dumbbell: [
		'M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z',
		'm2.5 21.5 1.4-1.4',
		'm20.1 3.9 1.4-1.4',
		'M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z',
		'm9.6 14.4 4.8-4.8'
	],
	run: [
		'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z',
		'M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z',
		'M16 17h4',
		'M4 13h4'
	]
};

/** Bottom scrim + title/date/stats/wordmark — shared by both card types. */
function statBandSvg(
	width: number,
	height: number,
	opts: { title: string; subtitle?: string; stats: RunCardStat[] }
): string {
	const pad = 56;
	// Tall, front-loaded scrim so the dark cover reaches up behind the title.
	const bandTop = height - 360;
	const cols = opts.stats.slice(0, 4);
	const colW = cols.length > 0 ? Math.floor((width - 2 * pad) / cols.length) : 0;
	const colX = (i: number) => pad + i * colW;
	const statSvg = cols
		.map(
			(st, i) =>
				`<text x="${colX(i)}" y="${height - 74}" ${FONT} font-size="50" font-weight="700" fill="#ffffff">${escapeXml(st.value)}</text>` +
				`<text x="${colX(i)}" y="${height - 36}" ${FONT} font-size="24" fill="#d8dee9" letter-spacing="1.5">${escapeXml(st.label.toUpperCase())}</text>`
		)
		.join('');
	return (
		`<defs><linearGradient id="band" x1="0" y1="0" x2="0" y2="1">` +
		`<stop offset="0" stop-color="#2e3440" stop-opacity="0"/>` +
		`<stop offset="0.16" stop-color="#2e3440" stop-opacity="0.72"/>` +
		`<stop offset="0.5" stop-color="#2e3440" stop-opacity="0.9"/>` +
		`<stop offset="1" stop-color="#2e3440" stop-opacity="0.96"/>` +
		`</linearGradient></defs>` +
		`<rect x="0" y="${bandTop}" width="${width}" height="${height - bandTop}" fill="url(#band)"/>` +
		`<text x="${pad}" y="${height - 220}" ${FONT} font-size="62" font-weight="800" fill="#ffffff">${escapeXml(opts.title)}</text>` +
		(opts.subtitle
			? `<text x="${pad}" y="${height - 174}" ${FONT} font-size="32" fill="#e5e9f0">${escapeXml(opts.subtitle)}</text>`
			: '') +
		statSvg +
		`<text x="${width - pad}" y="${height - 36}" text-anchor="end" ${FONT} font-size="32" font-weight="700" fill="#ffffff" fill-opacity="0.85">bocken.org</text>`
	);
}

/** Gold PR badges stacked vertically from (x0, y0). Each label already carries
 * the exercise, PR type and value, so the gold pill is the only "PR" marker. */
function prPillsSvg(prs: string[], x0: number, y0: number): string {
	const shown = prs.slice(0, 3);
	if (!shown.length) return '';
	const fs = 28;
	const h = 52;
	const padX = 24;
	const gap = 12;
	return shown
		.map((label, i) => {
			const w = Math.round(label.length * fs * 0.55) + padX * 2;
			const y = y0 + i * (h + gap);
			return (
				`<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ebcb8b"/>` +
				`<text x="${x0 + w / 2}" y="${y + h / 2 + fs * 0.34}" text-anchor="middle" ${FONT} font-size="${fs}" font-weight="700" fill="#2e3440">${escapeXml(label)}</text>`
			);
		})
		.join('');
}

/**
 * Layout for the no-map cards: title at top, then PR badges, then the stats
 * blown up into a 2×2 grid spanning the lower two-thirds — with no map to
 * show, the numbers are the subject and get the room.
 */
function backdropContentSvg(
	width: number,
	height: number,
	opts: { title: string; subtitle?: string; stats: RunCardStat[]; prs?: string[] }
): string {
	const pad = 84;
	const cols = opts.stats.slice(0, 4);
	const colX = [pad, Math.round(width / 2 + 24)];
	const rowYv = [Math.round(height * 0.58), Math.round(height * 0.85)];
	const statSvg = cols
		.map((st, i) => {
			const x = colX[i % 2];
			const vy = rowYv[Math.floor(i / 2)];
			return (
				`<text x="${x}" y="${vy}" ${FONT} font-size="116" font-weight="800" fill="#ffffff">${escapeXml(st.value)}</text>` +
				`<text x="${x}" y="${vy + 52}" ${FONT} font-size="34" font-weight="600" fill="#d8dee9" letter-spacing="2.5">${escapeXml(st.label.toUpperCase())}</text>`
			);
		})
		.join('');
	return (
		`<text x="${pad}" y="156" ${FONT} font-size="66" font-weight="800" fill="#ffffff">${escapeXml(opts.title)}</text>` +
		(opts.subtitle
			? `<text x="${pad}" y="206" ${FONT} font-size="34" fill="#e5e9f0">${escapeXml(opts.subtitle)}</text>`
			: '') +
		prPillsSvg(opts.prs ?? [], pad, 248) +
		statSvg +
		`<text x="${width - pad}" y="${height - 52}" text-anchor="end" ${FONT} font-size="30" font-weight="700" fill="#ffffff" fill-opacity="0.7">bocken.org</text>`
	);
}

/** Composite a full-canvas SVG overlay onto a background PNG → WebP. */
async function finishCard(bgPng: Buffer, width: number, height: number, inner: string): Promise<Buffer> {
	const overlay = Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${inner}</svg>`
	);
	return sharp(bgPng).composite([{ input: overlay, left: 0, top: 0 }]).webp({ quality: 82 }).toBuffer();
}

/**
 * Share card: the (near-square) route map with a translucent bottom band
 * carrying the run title, date and key stats, plus a site wordmark. 1080×1080
 * by default — squarer reads better as a shared/social image. Returns a WebP
 * buffer or null if the map couldn't be built.
 */
export async function renderRunCard(opts: RenderRunCardOpts): Promise<Buffer | null> {
	const width = opts.width ?? 1080;
	const height = opts.height ?? 1080;
	const png = await buildRouteMapPng({ ...opts, width, height });
	if (!png) return null;
	return finishCard(png.buffer, width, height, statBandSvg(width, height, opts));
}

export type BackdropVariant = 'dumbbell' | 'run';

/** Dark gradient backdrop with a large faint icon watermark. */
async function buildBackdrop(width: number, height: number, variant: BackdropVariant): Promise<Buffer> {
	const paths = BACKDROP_ICONS[variant] ?? BACKDROP_ICONS.dumbbell;
	const scale = (Math.min(width, height) * 0.62) / 24;
	const tx = (width - 24 * scale) / 2;
	const ty = (height - 24 * scale) / 2 - height * 0.08;
	const icon =
		`<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale.toFixed(3)})" ` +
		`fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
		paths.map((d) => `<path d="${d}"/>`).join('') +
		`</g>`;
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">` +
		`<stop offset="0" stop-color="#434c5e"/><stop offset="1" stop-color="#2e3440"/>` +
		`</linearGradient></defs>` +
		`<rect width="${width}" height="${height}" fill="url(#bg)"/>` +
		icon +
		`</svg>`;
	return sharp(Buffer.from(svg)).png().toBuffer();
}

export interface RenderBackdropCardOpts {
	/** Watermark icon: `dumbbell` (strength) or `run` (GPS-less cardio). */
	variant: BackdropVariant;
	title: string;
	subtitle?: string;
	stats: RunCardStat[];
	/** Preformatted PR labels, e.g. "Bench press 100 kg". */
	prs?: string[];
	width?: number;
	height?: number;
}

/**
 * Share card for a session with no map: an icon watermark backdrop with PR
 * badges and the same stats band. Used for weightlifting (dumbbell) and
 * manually logged / GPS-less cardio (footprints).
 */
export async function renderBackdropCard(opts: RenderBackdropCardOpts): Promise<Buffer | null> {
	const width = opts.width ?? 1080;
	const height = opts.height ?? 1080;
	const bg = await buildBackdrop(width, height, opts.variant);
	return finishCard(bg, width, height, backdropContentSvg(width, height, opts));
}
