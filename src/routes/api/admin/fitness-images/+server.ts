import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import {
	countRegenerable,
	regenerateSessionBatch,
	regenerateSegmentBatch,
	pruneStaleImages
} from '$lib/server/fitnessImageRegen';

/**
 * Bulk regeneration of the pre-rendered fitness images, driven by
 * `/admin/fitness-images`. Access is gated in `hooks.server.ts` (owner only),
 * same as `/finances`.
 *
 * Rendering every run in one request would take minutes and time out behind
 * nginx, so the work is handed out in batches: the page POSTs with a `skip`
 * and gets back the next one, which is also what feeds its progress bar.
 */

/** Items per batch. Each session render fetches ~10–30 map tiles and encodes
 * two WebPs, so keep the batch small enough to answer well inside any proxy
 * timeout even on a cold tile cache. */
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

// GET /api/admin/fitness-images — how much work a full run would be.
export const GET: RequestHandler = async () => {
	await dbConnect();
	return json(await countRegenerable());
};

// POST /api/admin/fitness-images — render one batch, or prune orphaned files.
export const POST: RequestHandler = async ({ request }) => {
	await dbConnect();

	const body = await request.json().catch(() => ({}));
	const kind = body?.kind;
	const skip = Number.isInteger(body?.skip) && body.skip >= 0 ? body.skip : 0;
	const limit = Math.min(
		MAX_LIMIT,
		Number.isInteger(body?.limit) && body.limit > 0 ? body.limit : DEFAULT_LIMIT
	);

	if (kind === 'sessions') return json(await regenerateSessionBatch(skip, limit));
	if (kind === 'segments') return json(await regenerateSegmentBatch(skip, limit));
	if (kind === 'prune') return json(await pruneStaleImages());

	throw error(400, 'kind must be one of: sessions, segments, prune');
};
