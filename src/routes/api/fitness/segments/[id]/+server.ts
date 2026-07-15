import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Segment } from '$models/Segment';
import { SegmentEffort } from '$models/SegmentEffort';
import { optedOutUsernames } from '$lib/server/segments';
import { requireAuth } from '$lib/server/middleware/auth';
import { assertObjectId } from '$lib/server/ownedResource';

// GET /api/fitness/segments/[id] — segment + global leaderboard + my efforts.
export const GET: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'segment ID');

  try {
    await dbConnect();
    const me = user.nickname;

    const segment = await Segment.findById(params.id).lean();
    if (!segment) return json({ error: 'Segment not found' }, { status: 404 });
    if (!segment.public && segment.createdBy !== me) {
      return json({ error: 'Segment not found' }, { status: 404 });
    }

    const optedOut = [...(await optedOutUsernames())];

    // Leaderboard: each sharing athlete's best effort, fastest first (opt-out).
    const boardRows = await SegmentEffort.aggregate([
      { $match: { segmentId: segment._id, userId: { $nin: optedOut } } },
      { $sort: { elapsedSeconds: 1 } },
      {
        $group: {
          _id: '$userId',
          elapsedSeconds: { $first: '$elapsedSeconds' },
          date: { $first: '$date' }
        }
      },
      { $sort: { elapsedSeconds: 1 } }
    ]);
    // Record-hold streaks: replay every opted-in effort in chronological order,
    // tracking who held the fastest time (the "record"). A faster effort takes
    // the record from that moment; ties keep the incumbent. For each athlete we
    // keep their LONGEST uninterrupted reign (in days); the current holder's
    // reign runs to now.
    const holdEfforts = await SegmentEffort.find({ segmentId: segment._id, userId: { $nin: optedOut } })
      .sort({ date: 1 })
      .select('userId elapsedSeconds date')
      .lean();
    const holdMs = new Map<string, number>();
    const keepLongest = (user: string, ms: number) => {
      if (ms > (holdMs.get(user) ?? 0)) holdMs.set(user, ms);
    };
    let bestSoFar = Infinity;
    let holder: string | null = null;
    let reignStart = 0;
    for (const e of holdEfforts) {
      if (e.elapsedSeconds < bestSoFar) {
        const at = new Date(e.date).getTime();
        if (holder !== null) keepLongest(holder, at - reignStart);
        holder = e.userId;
        bestSoFar = e.elapsedSeconds;
        reignStart = at;
      }
    }
    if (holder !== null) keepLongest(holder, Date.now() - reignStart);

    const leaderboard = boardRows.map((r, i) => ({
      rank: i + 1,
      username: r._id,
      elapsedSeconds: r.elapsedSeconds,
      date: r.date,
      holdDays: Math.round((holdMs.get(r._id) ?? 0) / 86_400_000)
    }));

    // The viewer's own efforts (history), regardless of opt-in.
    const myEfforts = await SegmentEffort.find({ segmentId: segment._id, userId: me })
      .sort({ date: 1 })
      .select('elapsedSeconds date sessionId')
      .lean();
    const myBest = myEfforts.length ? Math.min(...myEfforts.map((e) => e.elapsedSeconds)) : null;
    const myRank = leaderboard.find((r) => r.username === me)?.rank ?? null;

    // Runs on this segment by anyone in the last 30 days.
    const since = new Date(Date.now() - 30 * 86_400_000);
    const recentCount = await SegmentEffort.countDocuments({ segmentId: segment._id, date: { $gte: since } });

    return json({ segment, leaderboard, myEfforts, myBest, myRank, recentCount });
  } catch (error) {
    console.error('Error fetching segment:', error);
    return json({ error: 'Failed to fetch segment' }, { status: 500 });
  }
};

// DELETE /api/fitness/segments/[id] — creator only; cascade its efforts.
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'segment ID');

  try {
    await dbConnect();

    const segment = await Segment.findOneAndDelete({
      _id: params.id,
      createdBy: user.nickname
    });
    if (!segment) {
      return json({ error: 'Segment not found or unauthorized' }, { status: 404 });
    }
    await SegmentEffort.deleteMany({ segmentId: params.id });

    return json({ message: 'Segment deleted' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    return json({ error: 'Failed to delete segment' }, { status: 500 });
  }
};
