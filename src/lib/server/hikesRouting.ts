/**
 * Server-side helpers for the /hikes route-builder API.
 *
 * Wraps BRouter (primary) and OSRM (fallback) into one `routeWaypoints`
 * function with a content-hashed disk cache. Falls through to linear
 * interpolation when both upstreams fail so the editor stays usable
 * offline.
 *
 * Cache layout:
 *   scripts/.cache/brouter/<sha256-of-payload>.json
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type RoutingProfile = 'hiking-mountain' | 'trekking' | 'road';

export type LatLng = { lat: number; lng: number };

const CACHE_DIR = path.resolve(process.cwd(), 'scripts', '.cache', 'brouter');

async function readCache(key: string): Promise<unknown | null> {
	try {
		const buf = await fs.readFile(path.join(CACHE_DIR, key), 'utf-8');
		return JSON.parse(buf);
	} catch {
		return null;
	}
}

async function writeCache(key: string, value: unknown): Promise<void> {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		await fs.writeFile(path.join(CACHE_DIR, key), JSON.stringify(value));
	} catch {
		/* cache write failure is non-fatal */
	}
}

function hashKey(payload: unknown): string {
	return (
		crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16) +
		'.json'
	);
}

const BROUTER_PROFILE: Record<RoutingProfile, string> = {
	'hiking-mountain': 'hiking-mountain',
	trekking: 'trekking',
	road: 'car-fast'
};

const OSRM_PROFILE: Record<RoutingProfile, string> = {
	'hiking-mountain': 'foot',
	trekking: 'foot',
	road: 'driving'
};

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
	try {
		const res = await fetch(url, {
			signal,
			headers: { 'User-Agent': 'bocken-homepage route-builder' }
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

type BrouterGeoJson = {
	type: string;
	features: Array<{
		geometry: { coordinates: number[][] };
	}>;
};

type OsrmResponse = {
	code: string;
	routes?: Array<{
		geometry: { coordinates: number[][] };
	}>;
};

/** Pair `(A,B), (B,C), ...` so segments can be cached per-pair. */
function pairs(waypoints: LatLng[]): Array<[LatLng, LatLng]> {
	const out: Array<[LatLng, LatLng]> = [];
	for (let i = 0; i < waypoints.length - 1; i++) {
		out.push([waypoints[i], waypoints[i + 1]]);
	}
	return out;
}

/** Haversine distance in metres between two LatLng. */
function haversineM(a: LatLng, b: LatLng): number {
	const R = 6_371_000;
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

/** Below this pair distance we don't bother snapping. Two waypoints that close
 *  are nearly always image-EXIF points placed within a few footsteps of each
 *  other; routing them produces noisy "snap to the nearest trail and back"
 *  detours and burns a BRouter API call for nothing. Straight line wins. */
const MIN_SNAP_DISTANCE_M = 50;

async function routeBrouter(
	a: LatLng,
	b: LatLng,
	profile: RoutingProfile,
	signal: AbortSignal
): Promise<Array<[number, number, number?]> | null> {
	const url =
		`https://brouter.de/brouter?lonlats=${a.lng},${a.lat}|${b.lng},${b.lat}` +
		`&profile=${BROUTER_PROFILE[profile]}&alternativeidx=0&format=geojson`;
	const json = await fetchJson<BrouterGeoJson>(url, signal);
	if (!json?.features?.[0]?.geometry?.coordinates) return null;
	const coords = json.features[0].geometry.coordinates;
	// BRouter geojson is [lng, lat, ele].
	return coords.map((c) => [c[0], c[1], typeof c[2] === 'number' ? c[2] : undefined] as [number, number, number?]);
}

async function routeOsrm(
	a: LatLng,
	b: LatLng,
	profile: RoutingProfile,
	signal: AbortSignal
): Promise<Array<[number, number]> | null> {
	const url =
		`https://router.project-osrm.org/route/v1/${OSRM_PROFILE[profile]}/` +
		`${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
	const json = await fetchJson<OsrmResponse>(url, signal);
	if (json?.code !== 'Ok' || !json.routes?.[0]?.geometry?.coordinates) return null;
	return json.routes[0].geometry.coordinates as Array<[number, number]>;
}

function linearSegment(a: LatLng, b: LatLng, n = 16): Array<[number, number]> {
	const out: Array<[number, number]> = [];
	for (let i = 0; i <= n; i++) {
		const f = i / n;
		out.push([a.lng + (b.lng - a.lng) * f, a.lat + (b.lat - a.lat) * f]);
	}
	return out;
}

/**
 * Resolve a routed polyline per waypoint pair.
 * `forceLinear` skips upstream routing — handy when the editor knows the route
 * is off-trail.
 */
export async function routeWaypoints(opts: {
	waypoints: LatLng[];
	profile: RoutingProfile;
	forceLinear?: boolean;
}): Promise<{
	segments: Array<Array<[number, number, number?]>>;
	source: 'brouter' | 'osrm' | 'linear' | 'mixed' | 'cache';
}> {
	const segments: Array<Array<[number, number, number?]>> = [];
	const sources = new Set<'brouter' | 'osrm' | 'linear' | 'cache'>();

	const ac = new AbortController();
	const timeout = setTimeout(() => ac.abort(), 20_000);

	try {
		for (const [a, b] of pairs(opts.waypoints)) {
			let seg: Array<[number, number, number?]> | null = null;

			const shortPair = haversineM(a, b) < MIN_SNAP_DISTANCE_M;

			if (!opts.forceLinear && !shortPair) {
				const key = hashKey({ a, b, p: opts.profile });
				const cached = (await readCache(key)) as Array<[number, number, number?]> | null;
				if (cached && Array.isArray(cached)) {
					seg = cached;
					sources.add('cache');
				}
				if (!seg) {
					seg = await routeBrouter(a, b, opts.profile, ac.signal);
					if (seg) sources.add('brouter');
				}
				if (!seg) {
					const osrm = await routeOsrm(a, b, opts.profile, ac.signal);
					if (osrm) {
						seg = osrm.map((c) => [c[0], c[1]] as [number, number, number?]);
						sources.add('osrm');
					}
				}
				if (seg) {
					await writeCache(hashKey({ a, b, p: opts.profile }), seg);
				}
			}

			if (!seg) {
				// Short pairs don't need 16-step interpolation — two endpoints suffice.
				seg = shortPair
					? [
							[a.lng, a.lat] as [number, number, number?],
							[b.lng, b.lat] as [number, number, number?]
						]
					: linearSegment(a, b).map((c) => [c[0], c[1]] as [number, number, number?]);
				sources.add('linear');
			}
			segments.push(seg);
		}
	} finally {
		clearTimeout(timeout);
	}

	const source = sources.size === 1 ? [...sources][0] : 'mixed';
	return { segments, source };
}

// ---------------------------------------------------------------------------
// Swisstopo elevation enrichment
// ---------------------------------------------------------------------------

const ELEV_CACHE_DIR = path.resolve(process.cwd(), 'scripts', '.cache', 'swisstopo-elevation');

type SwisstopoProfile = Array<{ alts: { COMB?: number; DTM2?: number; DTM25?: number } }>;

/**
 * WGS84 (lng, lat in degrees) → CH1903+ / LV95 (easting, northing in
 * metres). Swisstopo's elevation services only speak the native Swiss
 * projections (sr 21781 / 2056); they reject `sr=4326` outright. Their
 * official "approximation" formulas yield ±1 m positional accuracy
 * within the Swiss bbox — well below the elevation grid resolution
 * (DTM25 = 25 m, DTM2 = 2 m), so doing the conversion in-process is
 * cheap, dependency-free, and avoids a per-coord round-trip to the
 * reframe service.
 *
 * Source: https://www.swisstopo.admin.ch/en/transformation-calculation-services
 */
function wgs84ToLv95(lng: number, lat: number): { easting: number; northing: number } {
	const phi = (lat * 3600 - 169028.66) / 10000;
	const lam = (lng * 3600 - 26782.5) / 10000;
	const phi2 = phi * phi;
	const phi3 = phi2 * phi;
	const lam2 = lam * lam;
	const lam3 = lam2 * lam;
	const easting =
		2600072.37 +
		211455.93 * lam -
		10938.51 * lam * phi -
		0.36 * lam * phi2 -
		44.54 * lam3;
	const northing =
		1200147.07 +
		308807.95 * phi +
		3745.25 * lam2 +
		76.63 * phi2 -
		194.56 * lam2 * phi +
		119.79 * phi3;
	return { easting, northing };
}

async function heightAt(lng: number, lat: number): Promise<number | null> {
	const key = hashKey({ kind: 'height', lng, lat });
	try {
		await fs.mkdir(ELEV_CACHE_DIR, { recursive: true });
		const cached = await fs.readFile(path.join(ELEV_CACHE_DIR, key), 'utf-8').catch(() => null);
		if (cached) return JSON.parse(cached) as number | null;
	} catch { /* ignored */ }

	const { easting, northing } = wgs84ToLv95(lng, lat);
	const url =
		`https://api3.geo.admin.ch/rest/services/height` +
		`?easting=${easting}&northing=${northing}&sr=2056`;
	let elev: number | null = null;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'bocken-homepage route-builder' }
		});
		if (res.ok) {
			const data = (await res.json()) as { height?: string | number };
			const raw = data.height;
			const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
			elev = Number.isFinite(n) ? n : null;
		}
	} catch { /* keep null */ }

	try {
		await fs.writeFile(path.join(ELEV_CACHE_DIR, key), JSON.stringify(elev));
	} catch { /* ignored */ }
	return elev;
}

/**
 * Enrich a coordinate list (`[lng, lat][]`) with elevations from Swisstopo.
 * Cached on disk by content hash. Returns the elevations aligned 1:1 with
 * the input.
 *
 * Implementation note: profile.json sampled along a LineString breaks when
 * the input contains consecutive identical coordinates (zero-length sub-
 * segments) — Swisstopo returns fewer samples than requested, which
 * silently shifts every elevation that follows. We dedupe consecutive
 * duplicates before calling profile.json and expand the result back; for
 * the resulting single-unique-vertex degenerate case we fall through to
 * the per-point `height` endpoint instead.
 */
export async function enrichElevations(
	coordinates: Array<[number, number]>
): Promise<(number | null)[]> {
	if (coordinates.length === 0) return [];

	// Collapse consecutive identical coords into runs. `positions` records
	// where each unique point sat in the original input so we can fan the
	// elevation result back out 1:1.
	type Run = { coord: [number, number]; positions: number[] };
	const runs: Run[] = [];
	for (let i = 0; i < coordinates.length; i++) {
		const c = coordinates[i];
		const tail = runs[runs.length - 1];
		if (tail && tail.coord[0] === c[0] && tail.coord[1] === c[1]) {
			tail.positions.push(i);
		} else {
			runs.push({ coord: c, positions: [i] });
		}
	}

	// Single unique vertex (degenerate LineString) → `height` endpoint.
	if (runs.length === 1) {
		const e = await heightAt(runs[0].coord[0], runs[0].coord[1]);
		return new Array<number | null>(coordinates.length).fill(e);
	}

	const uniqueCoords = runs.map((r) => r.coord);
	const key = hashKey({ kind: 'elev', c: uniqueCoords });
	let uniqueElev: (number | null)[] | null = null;
	try {
		await fs.mkdir(ELEV_CACHE_DIR, { recursive: true });
		const cached = await fs.readFile(path.join(ELEV_CACHE_DIR, key), 'utf-8').catch(() => null);
		if (cached) uniqueElev = JSON.parse(cached) as (number | null)[];
	} catch { /* ignored */ }

	if (!uniqueElev) {
		uniqueElev = new Array<number | null>(uniqueCoords.length).fill(null);
		// profile.json must be POSTed: even ~100-point GETs return HTTP 400,
		// and at our densified-track sizes the URL hits the upstream's
		// ~8 KB length cap (silent HTTP 414). POST + form-encoded body has
		// no such limit and accepts at least 500 coords per call, so the
		// chunking is just for politeness against the public API.
		const CHUNK = 500;
		let cursor = 0;
		while (cursor < uniqueCoords.length) {
			const slice = uniqueCoords.slice(cursor, Math.min(uniqueCoords.length, cursor + CHUNK));
			// Convert each WGS84 coord to LV95 — the elevation services only
			// accept the native Swiss projections (`sr=2056`); `sr=4326` is
			// rejected with HTTP 400.
			const lv95: number[][] = slice.map(([lng, lat]) => {
				const p = wgs84ToLv95(lng, lat);
				return [p.easting, p.northing];
			});
			const slicedGeom = { type: 'LineString', coordinates: lv95 };
			const body = new URLSearchParams({
				geom: JSON.stringify(slicedGeom),
				nb_points: String(slice.length),
				offset: '0',
				sr: '2056'
			});
			try {
				const res = await fetch('https://api3.geo.admin.ch/rest/services/profile.json', {
					method: 'POST',
					headers: {
						'User-Agent': 'bocken-homepage route-builder',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body
				});
				if (res.ok) {
					const json = (await res.json()) as SwisstopoProfile;
					for (let i = 0; i < json.length && cursor + i < uniqueElev.length; i++) {
						const e = json[i].alts?.COMB ?? json[i].alts?.DTM2 ?? json[i].alts?.DTM25 ?? null;
						uniqueElev[cursor + i] = typeof e === 'number' ? e : null;
					}
				}
			} catch { /* keep nulls */ }
			cursor += CHUNK;
		}

		try {
			await fs.writeFile(path.join(ELEV_CACHE_DIR, key), JSON.stringify(uniqueElev));
		} catch { /* ignored */ }
	}

	const elevations: (number | null)[] = new Array(coordinates.length).fill(null);
	for (let r = 0; r < runs.length; r++) {
		const e = uniqueElev[r];
		for (const pos of runs[r].positions) {
			elevations[pos] = e;
		}
	}
	return elevations;
}

// ---------------------------------------------------------------------------
// Per-user rate limiter (in-memory token bucket).
// ---------------------------------------------------------------------------

const RATE_BUCKETS = new Map<string, { tokens: number; refilledAt: number }>();
const RATE_LIMIT = 30;          // requests per minute
const RATE_WINDOW_MS = 60_000;

export function rateLimit(key: string): { ok: boolean; retryAfter?: number } {
	const now = Date.now();
	const bucket = RATE_BUCKETS.get(key) ?? { tokens: RATE_LIMIT, refilledAt: now };
	const refillTokens = Math.floor(((now - bucket.refilledAt) / RATE_WINDOW_MS) * RATE_LIMIT);
	if (refillTokens > 0) {
		bucket.tokens = Math.min(RATE_LIMIT, bucket.tokens + refillTokens);
		bucket.refilledAt = now;
	}
	if (bucket.tokens <= 0) {
		RATE_BUCKETS.set(key, bucket);
		return { ok: false, retryAfter: Math.ceil((RATE_WINDOW_MS - (now - bucket.refilledAt)) / 1000) };
	}
	bucket.tokens -= 1;
	RATE_BUCKETS.set(key, bucket);
	return { ok: true };
}
