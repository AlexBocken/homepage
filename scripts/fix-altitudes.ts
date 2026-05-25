/**
 * Re-derive track-point altitudes from a real terrain model.
 *
 * Phone GPS altitude is noisy (often ±10-20 m), which throws off the elevation
 * profile and the ascend/descend stats. This script keeps every point's exact
 * lat/lon and only rewrites its `<ele>`, sourcing the height from swisstopo's
 * swissALTI3D / DHM25 combined model (~0.5-2 m vertical accuracy) at that exact
 * coordinate.
 *
 *   1. Collect every `<wpt>` and `<trkpt>` in each `track.gpx`.
 *   2. Convert WGS84 → LV95 (swisstopo approximate formula, ~1 m horizontal —
 *      negligible for an elevation lookup).
 *   3. Ask swisstopo for the height of each distinct point (one batched
 *      `profile.json` POST per ~1000 points; per-point `height` as a fallback),
 *      cached on disk so re-runs and shared points are free.
 *   4. Surgically replace each point's `<ele>` value, leaving coordinates,
 *      timestamps, `<bocken:image>` extensions and all formatting untouched.
 *
 * swisstopo only covers Switzerland: points outside CH keep their original
 * elevation and are reported as skipped.
 *
 * Usage:
 *   pnpm exec vite-node scripts/fix-altitudes.ts [slug...] [--dry-run]
 *     (no slug → every hike under src/content/hikes/)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'hikes');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'swisstopo-elevation.json');

const PROFILE_URL = 'https://api3.geo.admin.ch/rest/services/profile.json';
const HEIGHT_URL = 'https://api3.geo.admin.ch/rest/services/height';
// swisstopo's profile service handles a few thousand vertices per call; keep
// chunks well under that so the POST body and response stay modest.
const PROFILE_CHUNK = 1000;

// Matches a <wpt>/<trkpt> opening tag and its immediate <ele> child. The route
// builder always writes `<ele>` as the first child (verified across every
// track.gpx), so a single capture group around the value is enough to rewrite.
const POINT_ELE_RE =
	/(<(?:wpt|trkpt)\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>\s*<ele>)([^<]*)(<\/ele>)/g;

type Cache = Record<string, number>;

/** WGS84 (lat/lon, degrees) → CH1903+/LV95 (E, N), swisstopo approx formula. */
function wgs84ToLV95(lat: number, lon: number): [number, number] {
	const phi = (lat * 3600 - 169028.66) / 10000;
	const lam = (lon * 3600 - 26782.5) / 10000;
	const E =
		2600072.37 +
		211455.93 * lam -
		10938.51 * lam * phi -
		0.36 * lam * phi * phi -
		44.54 * lam ** 3;
	const N =
		1200147.07 +
		308807.95 * phi +
		3745.25 * lam * lam +
		76.63 * phi * phi -
		194.56 * lam * lam * phi +
		119.79 * phi ** 3;
	return [Math.round(E * 100) / 100, Math.round(N * 100) / 100];
}

const enKey = (E: number, N: number): string => `${E.toFixed(2)},${N.toFixed(2)}`;

async function loadCache(): Promise<Cache> {
	try {
		return JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
	} catch {
		return {};
	}
}

async function saveCache(cache: Cache): Promise<void> {
	await fs.mkdir(CACHE_DIR, { recursive: true });
	await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
}

/** Batched height lookup. Returns a map of `enKey` → height for resolved points. */
async function fetchProfile(coords: [number, number][]): Promise<Map<string, number>> {
	const out = new Map<string, number>();
	if (coords.length < 2) return out;
	const body = new URLSearchParams({
		geom: JSON.stringify({ type: 'LineString', coordinates: coords }),
		sr: '2056',
		distinct_points: 'true',
		nb_points: String(coords.length),
		offset: '0'
	});
	const res = await fetch(PROFILE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) throw new Error(`profile.json HTTP ${res.status}`);
	const rows = (await res.json()) as Array<{
		alts?: Record<string, number | null>;
		easting: number;
		northing: number;
	}>;
	for (const r of rows) {
		const h = r.alts?.COMB ?? r.alts?.DTM2 ?? r.alts?.DTM25;
		if (typeof h === 'number') out.set(enKey(r.easting, r.northing), h);
	}
	return out;
}

/** Single-point fallback (also the only option for a 1-point chunk). */
async function fetchHeight(E: number, N: number): Promise<number | null> {
	try {
		const res = await fetch(`${HEIGHT_URL}?easting=${E}&northing=${N}&sr=2056`);
		if (!res.ok) return null;
		const j = (await res.json()) as { height?: string | number; success?: boolean };
		if (j.success === false) return null;
		const h = typeof j.height === 'string' ? parseFloat(j.height) : j.height;
		return typeof h === 'number' && Number.isFinite(h) ? h : null;
	} catch {
		return null;
	}
}

type PointKey = string; // `${latStr},${lonStr}` exactly as written in the file

async function fixTrack(slug: string, cache: Cache, dryRun: boolean): Promise<void> {
	const file = path.join(CONTENT_DIR, slug, 'track.gpx');
	let text: string;
	try {
		text = await fs.readFile(file, 'utf-8');
	} catch {
		console.warn(`[fix-altitudes] ${slug}: no track.gpx, skipping`);
		return;
	}

	// Distinct points, keyed by the exact lat/lon strings in the file so the
	// rewrite can match without any float round-tripping.
	const points = new Map<PointKey, { lat: number; lon: number; E: number; N: number }>();
	for (const m of text.matchAll(POINT_ELE_RE)) {
		const key = `${m[2]},${m[3]}`;
		if (!points.has(key)) {
			const lat = parseFloat(m[2]);
			const lon = parseFloat(m[3]);
			const [E, N] = wgs84ToLV95(lat, lon);
			points.set(key, { lat, lon, E, N });
		}
	}
	if (points.size === 0) {
		console.warn(`[fix-altitudes] ${slug}: no points found`);
		return;
	}

	// Resolve heights for any points not already cached.
	const uncached = [...points.values()].filter((p) => cache[enKey(p.E, p.N)] === undefined);
	if (uncached.length > 0) {
		for (let i = 0; i < uncached.length; i += PROFILE_CHUNK) {
			const chunk = uncached.slice(i, i + PROFILE_CHUNK);
			let resolved = new Map<string, number>();
			try {
				resolved = await fetchProfile(chunk.map((p) => [p.E, p.N] as [number, number]));
			} catch (err) {
				console.warn(`[fix-altitudes] ${slug}: profile batch failed (${String(err)}), falling back per-point`);
			}
			for (const p of chunk) {
				const k = enKey(p.E, p.N);
				let h = resolved.get(k);
				if (h === undefined) h = (await fetchHeight(p.E, p.N)) ?? undefined;
				if (h !== undefined) cache[k] = h;
			}
		}
	}

	// Rewrite each <ele> in place; tally changes and out-of-CH skips.
	let updated = 0;
	let skipped = 0;
	let maxDelta = 0;
	const fixed = text.replace(POINT_ELE_RE, (full, open, latStr, lonStr, oldEle, close) => {
		const p = points.get(`${latStr},${lonStr}`)!;
		const h = cache[enKey(p.E, p.N)];
		if (h === undefined) {
			skipped++;
			return full; // outside CH coverage — keep original elevation
		}
		const newEle = h.toFixed(1);
		const old = parseFloat(oldEle);
		if (Number.isFinite(old)) maxDelta = Math.max(maxDelta, Math.abs(h - old));
		if (newEle !== oldEle.trim()) updated++;
		return `${open}${newEle}${close}`;
	});

	const summary =
		`${points.size} distinct pts · ${updated} ele rewritten · ` +
		`max Δ ${maxDelta.toFixed(1)} m` +
		(skipped > 0 ? ` · ${skipped} kept (outside CH)` : '');
	if (dryRun) {
		console.log(`[fix-altitudes] ${slug}: ${summary} (dry-run, not written)`);
		return;
	}
	if (fixed !== text) {
		await fs.writeFile(file, fixed);
		console.log(`[fix-altitudes] ${slug}: ${summary}`);
	} else {
		console.log(`[fix-altitudes] ${slug}: already up to date (${summary})`);
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	const slugArgs = args.filter((a) => !a.startsWith('--'));

	let slugs = slugArgs;
	if (slugs.length === 0) {
		const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
		slugs = entries
			.filter((e) => e.isDirectory() && !e.name.startsWith('TODO-'))
			.map((e) => e.name)
			.sort();
	}

	const cache = await loadCache();
	for (const slug of slugs) {
		await fixTrack(slug, cache, dryRun);
	}
	await saveCache(cache);
	console.log(`[fix-altitudes] done (${slugs.length} track(s), cache: ${Object.keys(cache).length} pts)`);
}

main().catch((err) => {
	console.error('[fix-altitudes] Fatal:', err);
	process.exit(1);
});
