import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { templateBoard } from '$lib/server/templateBoards';

/**
 * GET /api/fitness/stats/workout-templates?activity=running|cycling
 *
 * The caller's repeated cardio workouts: one row per template they have actually run,
 * with its fastest attempt (by pace), how many times it has been done, what it
 * typically covers and when it was last done — the board behind the segments page's
 * per-workout table.
 *
 * Own sessions only, and no `scope=all` counterpart: a template is a private recipe,
 * not a shared course, so there is nothing to rank across athletes. See
 * $lib/server/templateBoards for why pace rather than elapsed time is the metric.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	const kind = url.searchParams.get('activity') === 'cycling' ? 'cycling' : 'running';

	await dbConnect();
	const templates = await templateBoard(user.nickname, kind);

	return json({ activity: kind, templates });
};
