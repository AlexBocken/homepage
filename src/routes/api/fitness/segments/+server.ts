import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Segment } from '$models/Segment';
import { SegmentEffort } from '$models/SegmentEffort';
import { WorkoutSession, type IGpsPoint } from '$models/WorkoutSession';
import { buildSegmentGeometry, backfillSegment, optedOutUsernames } from '$lib/server/segments';
import mongoose from 'mongoose';

// POST /api/fitness/segments — create a segment from a slice of a run's track.
export const POST: RequestHandler = async ({ request, locals }) => {
  const session = locals.session ?? (await locals.auth());
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const { sessionId, exerciseIndex, startIdx, endIdx, name, public: isPublic } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return json({ error: 'Name is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return json({ error: 'Invalid session ID' }, { status: 400 });
    }
    if (!Number.isInteger(startIdx) || !Number.isInteger(endIdx) || endIdx <= startIdx) {
      return json({ error: 'Invalid track range' }, { status: 400 });
    }

    const ws = await WorkoutSession.findOne({
      _id: sessionId,
      createdBy: session.user.nickname
    }).lean();
    if (!ws) return json({ error: 'Session not found' }, { status: 404 });

    const exIdx = exerciseIndex == null ? null : Number(exerciseIndex);
    const track: IGpsPoint[] | undefined =
      exIdx == null ? ws.gpsTrack : ws.exercises?.[exIdx]?.gpsTrack;
    if (!track || track.length < 2) {
      return json({ error: 'No GPS track for that source' }, { status: 400 });
    }
    if (startIdx < 0 || endIdx >= track.length) {
      return json({ error: 'Track range out of bounds' }, { status: 400 });
    }

    const slice = track.slice(startIdx, endIdx + 1);
    const geom = buildSegmentGeometry(slice);
    if (!geom) {
      return json({ error: 'Selected section is too short' }, { status: 400 });
    }

    const segment = await Segment.create({
      name: name.trim(),
      activityType: ws.activityType ?? 'running',
      createdBy: session.user.nickname,
      public: isPublic !== false,
      points: geom.points,
      startPoint: geom.startPoint,
      endPoint: geom.endPoint,
      bbox: geom.bbox,
      distance: geom.distance,
      elevationGain: geom.elevationGain,
      pointCount: geom.pointCount,
      sourceSessionId: sessionId,
      sourceExerciseIndex: exIdx,
      sourceStartIdx: startIdx,
      sourceEndIdx: endIdx
    });

    // Populate efforts from history (creator's runs + opted-in users). Bounded;
    // awaited so the source run's own effort is immediately visible.
    const effortCount = await backfillSegment(segment).catch((err) => {
      console.error('Segment backfill failed:', err);
      return 0;
    });

    return json({ segment, effortCount }, { status: 201 });
  } catch (error) {
    console.error('Error creating segment:', error);
    return json({ error: 'Failed to create segment' }, { status: 500 });
  }
};

// GET /api/fitness/segments — list segments (?mine=1 for own only).
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = locals.session ?? (await locals.auth());
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const me = session.user.nickname;
    const mine = url.searchParams.get('mine') === '1';

    const filter = mine
      ? { createdBy: me }
      : { $or: [{ public: true }, { createdBy: me }] };

    const segments = await Segment.find(filter).sort({ createdAt: -1 }).lean();
    const ids = segments.map((s) => s._id);

    const [myBests, counts, optedOut] = await Promise.all([
      SegmentEffort.aggregate([
        { $match: { segmentId: { $in: ids }, userId: me } },
        { $group: { _id: '$segmentId', best: { $min: '$elapsedSeconds' } } }
      ]),
      SegmentEffort.aggregate([
        { $match: { segmentId: { $in: ids } } },
        { $group: { _id: { segmentId: '$segmentId', userId: '$userId' }, best: { $min: '$elapsedSeconds' } } }
      ]),
      optedOutUsernames()
    ]);

    const myBestMap = new Map(myBests.map((r) => [String(r._id), r.best]));
    // KOM (fastest sharing best-per-user) + athlete count per segment (opt-out).
    const komMap = new Map<string, number>();
    const athleteMap = new Map<string, Set<string>>();
    for (const r of counts) {
      const segId = String(r._id.segmentId);
      if (!athleteMap.has(segId)) athleteMap.set(segId, new Set());
      athleteMap.get(segId)!.add(r._id.userId);
      if (!optedOut.has(r._id.userId)) {
        const cur = komMap.get(segId);
        if (cur == null || r.best < cur) komMap.set(segId, r.best);
      }
    }

    const result = segments.map((s) => {
      const id = String(s._id);
      return {
        _id: id,
        name: s.name,
        activityType: s.activityType,
        createdBy: s.createdBy,
        public: s.public,
        points: s.points,
        distance: s.distance,
        elevationGain: s.elevationGain,
        athleteCount: athleteMap.get(id)?.size ?? 0,
        myBest: myBestMap.get(id) ?? null,
        komTime: komMap.get(id) ?? null
      };
    });

    return json({ segments: result });
  } catch (error) {
    console.error('Error listing segments:', error);
    return json({ error: 'Failed to list segments' }, { status: 500 });
  }
};
