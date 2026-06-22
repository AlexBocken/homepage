/**
 * Lazy generation + on-disk caching of the static route-map image for a
 * GPS-tracked workout session.
 *
 * The image is rendered once (on the first request that needs it) and stored
 * under `$IMAGE_DIR/fitness/<sessionId>.<hash>.webp`. The hash is derived from
 * the track, so a recalculated/snapped track yields a new filename and the
 * stale one is naturally orphaned. Serving + access control live in the route
 * handler (`/api/fitness/sessions/[id]/map.webp`); this module only knows how
 * to produce and locate the file.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { IMAGE_DIR } from '$env/static/private';
import {
	renderRunMap,
	renderRunCard,
	renderBackdropCard,
	type RunCardStat,
	type BackdropVariant
} from './staticRunMap';

const SUBDIR = 'fitness';

/** Minimal shape we read off a WorkoutSession (lean doc or POST payload). */
type TrackPoint = { lat: number; lng: number };
type SessionLike = {
	gpsTrack?: TrackPoint[];
	gpsPreview?: number[][];
	exercises?: Array<{ gpsTrack?: TrackPoint[]; gpsPreview?: number[][] }>;
};

/**
 * Best available route track as `[lat, lng]` tuples. Prefers a full-resolution
 * `gpsTrack` (top-level, then the first cardio exercise that has one); falls
 * back to the simplified `gpsPreview`. Returns null when there's nothing to draw.
 */
export function extractRunTrack(session: SessionLike): Array<[number, number]> | null {
	const fromPoints = (pts?: TrackPoint[]): Array<[number, number]> | null =>
		pts && pts.length >= 2 ? pts.map((p) => [p.lat, p.lng]) : null;
	const fromPreview = (pv?: number[][]): Array<[number, number]> | null =>
		pv && pv.length >= 2 ? pv.map((p) => [p[0], p[1]]) : null;

	if (session.gpsTrack) {
		const t = fromPoints(session.gpsTrack);
		if (t) return t;
	}
	for (const ex of session.exercises ?? []) {
		const t = fromPoints(ex.gpsTrack);
		if (t) return t;
	}
	if (session.gpsPreview) {
		const t = fromPreview(session.gpsPreview);
		if (t) return t;
	}
	for (const ex of session.exercises ?? []) {
		const t = fromPreview(ex.gpsPreview);
		if (t) return t;
	}
	return null;
}

/** Short content hash of the track so the filename changes when the route does. */
function trackHash(track: Array<[number, number]>): string {
	const h = crypto.createHash('sha256');
	// Bump when the route rendering (colour, casing, markers) changes so cached
	// map and card images regenerate instead of serving the old styling.
	h.update('route-style-orange-v1');
	// Round to ~1 m so float jitter doesn't churn the hash.
	for (const [lat, lng] of track) h.update(`${lat.toFixed(5)},${lng.toFixed(5)};`);
	return h.digest('hex').slice(0, 12);
}

/** Deterministic filename for a session's current track, or null if no track. */
export function runMapFilename(sessionId: string, session: SessionLike): string | null {
	const track = extractRunTrack(session);
	if (!track) return null;
	return `${sessionId}.${trackHash(track)}.webp`;
}

// Dedupe concurrent renders of the same file (e.g. a history list mounting many
// cards at once that all miss the cache).
const inFlight = new Map<string, Promise<string | null>>();

async function fileExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

/**
 * Ensure the route-map image exists on disk and return its filename (relative
 * to `$IMAGE_DIR/fitness/`), or null if there's no track / rendering failed.
 */
export async function ensureRunMapImage(
	sessionId: string,
	session: SessionLike
): Promise<string | null> {
	const track = extractRunTrack(session);
	if (!track) return null;

	const filename = `${sessionId}.${trackHash(track)}.webp`;
	const dir = path.join(IMAGE_DIR, SUBDIR);
	const filePath = path.join(dir, filename);

	if (await fileExists(filePath)) return filename;

	const existing = inFlight.get(filename);
	if (existing) return existing;

	const job = (async () => {
		const buf = await renderRunMap({ track });
		if (!buf) return null;
		await fs.mkdir(dir, { recursive: true });
		// Write to a temp file then rename so a concurrent reader never sees a
		// half-written image.
		const tmp = `${filePath}.tmp`;
		await fs.writeFile(tmp, buf);
		await fs.rename(tmp, filePath);
		return filename;
	})()
		.catch(() => null)
		.finally(() => inFlight.delete(filename));

	inFlight.set(filename, job);
	return job;
}

/** Absolute on-disk path for a generated run-map file. */
export function runMapPath(filename: string): string {
	return path.join(IMAGE_DIR, SUBDIR, filename);
}

/**
 * Ensure the route-map image for a SEGMENT exists on disk and return its
 * filename, or null if there's no usable polyline / rendering failed. Same
 * renderer + cache dir as runs; a `seg-` prefix keeps the namespaces apart.
 */
export async function ensureSegmentMapImage(
	segmentId: string,
	points: number[][] | undefined
): Promise<string | null> {
	const track: Array<[number, number]> | null =
		points && points.length >= 2 ? points.map((p) => [p[0], p[1]]) : null;
	if (!track) return null;

	// `.t2` busts the cache when the taller / thicker-stroke render params below change.
	const filename = `seg-${segmentId}.${trackHash(track)}.t2.webp`;
	const dir = path.join(IMAGE_DIR, SUBDIR);
	const filePath = path.join(dir, filename);

	if (await fileExists(filePath)) return filename;

	const existing = inFlight.get(filename);
	if (existing) return existing;

	const job = (async () => {
		const buf = await renderRunMap({ track, width: 900, height: 700, strokeWidth: 10 });
		if (!buf) return null;
		await fs.mkdir(dir, { recursive: true });
		const tmp = `${filePath}.tmp`;
		await fs.writeFile(tmp, buf);
		await fs.rename(tmp, filePath);
		return filename;
	})()
		.catch(() => null)
		.finally(() => inFlight.delete(filename));

	inFlight.set(filename, job);
	return job;
}

export type RunCard = { title: string; subtitle?: string; stats: RunCardStat[]; prs?: string[] };

const CARD_LAYOUT_VERSION = 'v5-prtype';

/**
 * No-map share card (dumbbell for strength, footprints for GPS-less cardio).
 * No track is needed; the hash keys on the variant + card content.
 */
export async function ensureBackdropCardImage(
	sessionId: string,
	card: RunCard,
	variant: BackdropVariant
): Promise<string | null> {
	const hash = crypto
		.createHash('sha256')
		.update('backdrop-' + variant + '-' + CARD_LAYOUT_VERSION)
		.update(JSON.stringify(card))
		.digest('hex')
		.slice(0, 12);
	const filename = `${sessionId}.${hash}.card.webp`;
	const dir = path.join(IMAGE_DIR, SUBDIR);
	const filePath = path.join(dir, filename);

	if (await fileExists(filePath)) return filename;
	const existing = inFlight.get(filename);
	if (existing) return existing;

	const job = (async () => {
		const buf = await renderBackdropCard({ ...card, variant });
		if (!buf) return null;
		await fs.mkdir(dir, { recursive: true });
		const tmp = `${filePath}.tmp`;
		await fs.writeFile(tmp, buf);
		await fs.rename(tmp, filePath);
		return filename;
	})()
		.catch(() => null)
		.finally(() => inFlight.delete(filename));

	inFlight.set(filename, job);
	return job;
}

/**
 * Ensure the share card (map + stats band) exists on disk and return its
 * filename, or null if there's no track / rendering failed. The hash folds in
 * the card text so a renamed run or recomputed stats yields a fresh file.
 */
export async function ensureRunCardImage(
	sessionId: string,
	session: SessionLike,
	card: RunCard
): Promise<string | null> {
	const track = extractRunTrack(session);
	if (!track) return null;

	const hash = crypto
		.createHash('sha256')
		.update(CARD_LAYOUT_VERSION)
		.update(trackHash(track))
		.update(JSON.stringify(card))
		.digest('hex')
		.slice(0, 12);
	const filename = `${sessionId}.${hash}.card.webp`;
	const dir = path.join(IMAGE_DIR, SUBDIR);
	const filePath = path.join(dir, filename);

	if (await fileExists(filePath)) return filename;

	const existing = inFlight.get(filename);
	if (existing) return existing;

	const job = (async () => {
		const buf = await renderRunCard({ track, ...card });
		if (!buf) return null;
		await fs.mkdir(dir, { recursive: true });
		const tmp = `${filePath}.tmp`;
		await fs.writeFile(tmp, buf);
		await fs.rename(tmp, filePath);
		return filename;
	})()
		.catch(() => null)
		.finally(() => inFlight.delete(filename));

	inFlight.set(filename, job);
	return job;
}
