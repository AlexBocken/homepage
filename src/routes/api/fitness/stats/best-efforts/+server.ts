import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { backfillBestEfforts, FOOT_ACTIVITIES } from '$lib/server/bestEffortsBackfill';

/**
 * GET /api/fitness/stats/best-efforts
 * The user's all-time fastest continuous split for every distance (1k … longest
 * run), each with the run it was set in. One row per distance.
 */
export const GET: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);

  await dbConnect();
  await backfillBestEfforts(user.nickname);

  const rows = await WorkoutSession.aggregate([
    { $match: { createdBy: user.nickname, activityType: { $in: FOOT_ACTIVITIES }, bestEfforts: { $exists: true } } },
    { $unwind: '$bestEfforts' },
    { $sort: { 'bestEfforts.seconds': 1 } },
    {
      $group: {
        _id: '$bestEfforts.km',
        seconds: { $first: '$bestEfforts.seconds' },
        sessionId: { $first: '$_id' },
        name: { $first: '$name' },
        date: { $first: '$startTime' }
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
    date: r.date as Date
  }));

  return json({ efforts });
};
