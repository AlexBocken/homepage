import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { backfillBestEfforts, activitiesForKind } from '$lib/server/bestEffortsBackfill';
import { optedOutUsernames } from '$lib/server/segments';

/**
 * GET /api/fitness/stats/best-efforts?scope=me|all&activity=running|cycling
 * The fastest continuous split for every distance (1k … longest run), one row
 * per distance, each with the run it was set in. `scope=me` (default) covers the
 * caller's runs; `scope=all` is the website-wide leaderboard across every
 * athlete who hasn't opted out of sharing (same opt-out as segment
 * leaderboards), with the record holder attributed per row. `activity` selects
 * the board (running pace vs cycling speed); the two never mix.
 *
 * Best efforts are precomputed and cached per run. The caller's runs are
 * backfilled lazily here; other users' runs enter the global board once they've
 * been computed (on save going forward, or when that user views their own stats).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = await requireAuth(locals);
  const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'me';
  const kind = url.searchParams.get('activity') === 'cycling' ? 'cycling' : 'running';

  await dbConnect();
  await backfillBestEfforts(user.nickname);

  const match: Record<string, unknown> = {
    activityType: { $in: activitiesForKind(kind) },
    bestEfforts: { $exists: true }
  };
  if (scope === 'all') {
    const optedOut = await optedOutUsernames();
    if (optedOut.size) match.createdBy = { $nin: [...optedOut] };
  } else {
    match.createdBy = user.nickname;
  }

  const rows = await WorkoutSession.aggregate([
    { $match: match },
    { $unwind: '$bestEfforts' },
    { $sort: { 'bestEfforts.seconds': 1 } },
    {
      $group: {
        _id: '$bestEfforts.km',
        seconds: { $first: '$bestEfforts.seconds' },
        sessionId: { $first: '$_id' },
        name: { $first: '$name' },
        date: { $first: '$startTime' },
        createdBy: { $first: '$createdBy' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const efforts = rows.map((r) => ({
    km: r._id as number,
    seconds: r.seconds as number,
    pace: (r.seconds as number) / 60 / (r._id as number), // min/km
    sessionId: String(r.sessionId),
    name: r.name as string,
    date: r.date as Date,
    createdBy: r.createdBy as string,
    mine: (r.createdBy as string) === user.nickname
  }));

  return json({ scope, activity: kind, efforts });
};
