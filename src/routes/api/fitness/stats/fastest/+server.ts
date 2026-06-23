import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { backfillBestEfforts, FOOT_ACTIVITIES } from '$lib/server/bestEffortsBackfill';

/**
 * GET /api/fitness/stats/fastest?km=N
 * The user's fastest continuous N-km split across all their runs. Best efforts
 * are precomputed per run and cached on the session; runs that haven't been
 * processed yet are backfilled lazily here (one-time per run).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = await requireAuth(locals);
  const km = Math.min(200, Math.max(1, Math.round(Number(url.searchParams.get('km')) || 5)));

  await dbConnect();
  await backfillBestEfforts(user.nickname);

  // Fastest split for the requested distance across all runs.
  const rows = await WorkoutSession.aggregate([
    { $match: { createdBy: user.nickname, activityType: { $in: FOOT_ACTIVITIES }, bestEfforts: { $exists: true } } },
    { $unwind: '$bestEfforts' },
    { $match: { 'bestEfforts.km': km } },
    { $sort: { 'bestEfforts.seconds': 1 } },
    { $limit: 1 },
    {
      $project: {
        name: 1,
        date: '$startTime',
        activityType: 1,
        gpsPreview: 1,
        seconds: '$bestEfforts.seconds'
      }
    }
  ]);

  const r = rows[0];
  const best = r
    ? {
        sessionId: String(r._id),
        name: r.name,
        date: r.date,
        activityType: r.activityType,
        seconds: r.seconds,
        pace: r.seconds / 60 / km, // min/km
        gpsPreview: r.gpsPreview ?? null
      }
    : null;

  return json({ km, best });
};
