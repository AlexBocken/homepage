/**
 * Bulk (re)generation of the pre-rendered fitness images — the route map and
 * share card per workout session, and the route map per segment.
 *
 * Normally these are rendered lazily on the first request that misses the disk
 * cache (see `runMapImage.ts`), and a change to the rendering bumps the hash in
 * the filename so every image regenerates on its own over time. That is fine
 * for a run someone opens tomorrow and useless for the hundred they never
 * reopen — and it leaves the *old* files behind forever. This module does both
 * halves eagerly, driven by `/admin/fitness-images`.
 *
 * Work is handed out in small batches so the caller can show progress and no
 * single request sits there rendering for minutes. Each batch is ordered by
 * `_id`, which is stable, so paging through with `skip` never skips or repeats
 * an item.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { IMAGE_DIR } from '$env/static/private';
import { WorkoutSession } from '$models/WorkoutSession';
import { Segment } from '$models/Segment';
import {
	ensureRunMapImage,
	ensureRunCardImage,
	ensureBackdropCardImage,
	ensureSegmentMapImage,
	extractRunTrack,
	expectedSessionFilenames,
	expectedSegmentFilename,
	type RunCard
} from './runMapImage';
import { buildRunCard, buildStrengthCard, buildCardioCard } from './runCardData';

const SUBDIR = 'fitness';

/** What a session needs loaded to render both of its images. */
const SESSION_FIELDS =
	'name startTime totalDistance totalVolume duration kcalEstimate prs gpsTrack gpsPreview exercises';

export interface RegenCounts {
	sessions: number;
	segments: number;
}

/** How much work a full regeneration is, for the progress bar. */
export async function countRegenerable(): Promise<RegenCounts> {
	const [sessions, segments] = await Promise.all([
		WorkoutSession.countDocuments({}),
		Segment.countDocuments({})
	]);
	return { sessions, segments };
}

export interface BatchResult {
	/** Items examined in this batch. */
	processed: number;
	/** Image files written. */
	rendered: number;
	/** Items whose render returned nothing (degenerate track, tile outage). */
	failed: number;
	/** `skip` for the next call, or null when there is nothing left. */
	nextSkip: number | null;
}

/**
 * Re-render the map + share card for a batch of sessions.
 *
 * `force` is on: the point of the admin tool is to rebuild what is already on
 * disk, not to fill gaps.
 */
export async function regenerateSessionBatch(skip: number, limit: number): Promise<BatchResult> {
	const sessions = await WorkoutSession.find({})
		.sort({ _id: 1 })
		.skip(skip)
		.limit(limit)
		.select(SESSION_FIELDS)
		.lean();

	let rendered = 0;
	let failed = 0;

	for (const session of sessions) {
		const id = String(session._id);
		const hasTrack = !!extractRunTrack(session);

		if (hasTrack) {
			const map = await ensureRunMapImage(id, session, { force: true });
			if (map) rendered++;
			else failed++;
		}

		// Same branch the card endpoint takes: GPS run → map card, GPS-less run
		// or ride → footprints, anything else → dumbbell.
		const card = hasTrack
			? await ensureRunCardImage(id, session, buildRunCard(session), { force: true })
			: (session.totalDistance ?? 0) > 0
				? await ensureBackdropCardImage(id, buildCardioCard(session), 'run', { force: true })
				: await ensureBackdropCardImage(id, buildStrengthCard(session), 'dumbbell', { force: true });
		if (card) rendered++;
		else failed++;
	}

	const nextSkip = sessions.length === limit ? skip + sessions.length : null;
	return { processed: sessions.length, rendered, failed, nextSkip };
}

/** Re-render the route map for a batch of segments. */
export async function regenerateSegmentBatch(skip: number, limit: number): Promise<BatchResult> {
	const segments = await Segment.find({})
		.sort({ _id: 1 })
		.skip(skip)
		.limit(limit)
		.select('points')
		.lean();

	let rendered = 0;
	let failed = 0;
	for (const seg of segments) {
		const file = await ensureSegmentMapImage(String(seg._id), seg.points, { force: true });
		if (file) rendered++;
		else failed++;
	}

	const nextSkip = segments.length === limit ? skip + segments.length : null;
	return { processed: segments.length, rendered, failed, nextSkip };
}

export interface PruneResult {
	deleted: number;
	kept: number;
	bytesFreed: number;
}

/**
 * Delete every file in `$IMAGE_DIR/fitness/` that no current session or segment
 * would ask for. Because the filename carries a hash of the track *and* of the
 * render style, a rendering change orphans the whole directory — pruning is the
 * only thing that ever reclaims it.
 *
 * The keep-set is computed, never rendered: `expectedSessionFilenames` /
 * `expectedSegmentFilename` hash exactly what the serving routes would ask for.
 * So a prune is cheap, and — importantly — it cannot delete a file it merely
 * failed to regenerate. Run it *after* a regeneration, not instead of one.
 */
export async function pruneStaleImages(): Promise<PruneResult> {
	const keep = new Set<string>();

	const sessions = await WorkoutSession.find({}).select(SESSION_FIELDS).lean();
	for (const session of sessions) {
		const id = String(session._id);
		const hasTrack = !!extractRunTrack(session);
		const [card, variant]: [RunCard, 'run' | 'dumbbell'] = hasTrack
			? [buildRunCard(session), 'run']
			: (session.totalDistance ?? 0) > 0
				? [buildCardioCard(session), 'run']
				: [buildStrengthCard(session), 'dumbbell'];
		for (const name of expectedSessionFilenames(id, session, card, variant)) keep.add(name);
	}

	const segments = await Segment.find({}).select('points').lean();
	for (const seg of segments) {
		const name = expectedSegmentFilename(String(seg._id), seg.points);
		if (name) keep.add(name);
	}

	const dir = path.join(IMAGE_DIR, SUBDIR);
	let entries: string[];
	try {
		entries = await fs.readdir(dir);
	} catch {
		return { deleted: 0, kept: keep.size, bytesFreed: 0 };
	}

	let deleted = 0;
	let bytesFreed = 0;
	for (const name of entries) {
		if (keep.has(name)) continue;
		// A `.tmp` belongs to a render happening right now — leave it alone.
		if (name.endsWith('.tmp')) continue;
		const full = path.join(dir, name);
		try {
			const stat = await fs.stat(full);
			if (!stat.isFile()) continue;
			await fs.unlink(full);
			deleted++;
			bytesFreed += stat.size;
		} catch {
			/* raced with another delete; nothing to do */
		}
	}

	return { deleted, kept: keep.size, bytesFreed };
}
