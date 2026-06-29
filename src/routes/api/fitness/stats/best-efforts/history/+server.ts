import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { backfillBestEfforts, activitiesForKind } from '$lib/server/bestEffortsBackfill';

/**
 * GET /api/fitness/stats/best-efforts/history?km=5&activity=running|cycling
 * The caller's best continuous split at one distance across *every* run, in
 * chronological order — the time series behind the per-distance progress chart.
 * One row per run that reached the distance. Unlike the all-time board this
 * keeps every run (not just the fastest) so the trend can be drawn.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = await requireAuth(locals);
  const km = Number(url.searchParams.get('km'));
  const kind = url.searchParams.get('activity') === 'cycling' ? 'cycling' : 'running';
  if (!Number.isInteger(km) || km <= 0) throw error(400, 'km must be a positive integer');

  await dbConnect();
  await backfillBestEfforts(user.nickname);

  const rows = await WorkoutSession.aggregate([
    {
      $match: {
        createdBy: user.nickname,
        activityType: { $in: activitiesForKind(kind) },
        bestEfforts: { $exists: true }
      }
    },
    { $unwind: '$bestEfforts' },
    { $match: { 'bestEfforts.km': km } },
    { $sort: { startTime: 1 } },
    {
      $project: {
        _id: 0,
        sessionId: '$_id',
        name: '$name',
        date: '$startTime',
        seconds: '$bestEfforts.seconds'
      }
    }
  ]);

  const history = rows.map((r) => ({
    sessionId: String(r.sessionId),
    name: r.name as string,
    date: r.date as Date,
    seconds: r.seconds as number,
    pace: (r.seconds as number) / 60 / km // min/km
  }));

  return json({ km, activity: kind, history });
};
