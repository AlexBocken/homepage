import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import type { IPr } from '$models/WorkoutSession';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { getExerciseById, getExerciseMetrics, exercises } from '$lib/data/exercises';
import { searchAllExercises } from '$lib/data/exercisedb';
import { detectCardioPrs } from '$lib/data/cardioPrRanges';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import { computeSessionKcal } from '$lib/server/computeSessionKcal';
import { matchSessionAgainstAllSegments, sessionBbox } from '$lib/server/segments';
import { addRunToGrid } from '$lib/server/segmentGrid';
import { advanceSchedulePointer } from '$lib/server/workoutSchedule';
import mongoose from 'mongoose';

function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

const GPS_ACTIVITIES = new Set(['running', 'walking', 'cycling', 'hiking']);

// Stretch/yoga exercise ids (memoised) — a "stretching" session contains one.
let _stretchIds: string[] | null = null;
function stretchExerciseIds(): string[] {
  if (!_stretchIds) _stretchIds = searchAllExercises({ stretchFilter: 'stretch' }).map((e) => e.id);
  return _stretchIds;
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const singular = (s: string) => (s.endsWith('s') ? s.slice(0, -1) : s);

/** Catalog exercise ids whose (en/de) name contains the query (plural-tolerant). */
function exerciseIdsMatching(query: string): string[] {
  const needle = singular(normName(query));
  if (needle.length < 2) return [];
  const ids: string[] = [];
  for (const e of exercises) {
    const names = [e.name, e.de?.name].filter(Boolean) as string[];
    if (names.some((nm) => normName(nm).includes(needle))) ids.push(e.id);
  }
  return ids;
}

/** Build the `q` text-search OR clauses: name, exercise name/id, numeric metric. */
function searchClauses(q: string): Record<string, unknown>[] {
  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const or: Record<string, unknown>[] = [{ name: rx }, { 'exercises.name': rx }];

  const ids = exerciseIdsMatching(q);
  if (ids.length) or.push({ 'exercises.exerciseId': { $in: ids } });

  // Numeric tokens like "95kg", "10km", "8 reps" → match a logged set's metric.
  const kg = q.match(/([\d.]+)\s*kg\b/i);
  const km = q.match(/([\d.]+)\s*km\b/i);
  const rep = q.match(/([\d.]+)\s*(?:reps?|x)\b/i);
  if (kg) or.push({ 'exercises.sets.weight': Number(kg[1]) });
  if (km) or.push({ 'exercises.sets.distance': Number(km[1]) });
  if (rep) or.push({ 'exercises.sets.reps': Number(rep[1]) });
  if (!kg && !km && !rep && /^[\d.]+$/.test(q.trim())) {
    const n = Number(q.trim());
    or.push(
      { 'exercises.sets.weight': n },
      { 'exercises.sets.distance': n },
      { 'exercises.sets.reps': n }
    );
  }
  return or;
}

// GET /api/fitness/sessions - Get all workout sessions for the user
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = locals.session ?? await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const month = url.searchParams.get('month'); // YYYY-MM

    const query: Record<string, any> = { createdBy: session.user.nickname };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(month + '-01T00:00:00.000Z');
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      query.startTime = { $gte: start, $lt: end };
    }

    // Date-range filter (YYYY-MM-DD, inclusive).
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (/^\d{4}-\d{2}-\d{2}$/.test(from ?? '') || /^\d{4}-\d{2}-\d{2}$/.test(to ?? '')) {
      query.startTime = { ...(query.startTime ?? {}) };
      if (from) query.startTime.$gte = new Date(`${from}T00:00:00.000`);
      if (to) query.startTime.$lte = new Date(`${to}T23:59:59.999`);
    }

    // --- Optional filters (history search) ---
    const num = (k: string) => {
      const v = url.searchParams.get(k);
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const range = (field: string, minK: string, maxK: string) => {
      const lo = num(minK);
      const hi = num(maxK);
      if (lo == null && hi == null) return;
      query[field] = {};
      if (lo != null) query[field].$gte = lo;
      if (hi != null) query[field].$lte = hi;
    };

    const q = url.searchParams.get('q')?.trim();
    if (q) query.$or = searchClauses(q);
    range('duration', 'minDuration', 'maxDuration');
    range('totalDistance', 'minDistance', 'maxDistance');

    const templateIds = url.searchParams.getAll('templateId').filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (templateIds.length) query.templateId = { $in: templateIds };

    const exerciseId = url.searchParams.get('exerciseId');
    if (exerciseId) query['exercises.exerciseId'] = exerciseId;

    // "weightlifting" = a strength session: has volume, no GPS activity type.
    const strengthMatch = {
      totalVolume: { $gt: 0 },
      $or: [{ activityType: { $exists: false } }, { activityType: null }]
    };
    const include = url.searchParams.getAll('activityType').filter(Boolean);
    const exclude = url.searchParams.getAll('notActivityType').filter(Boolean);
    const and: Record<string, unknown>[] = [...((query.$and as Record<string, unknown>[]) ?? [])];

    if (include.length) {
      const gps = include.filter((a) => GPS_ACTIVITIES.has(a));
      const or: Record<string, unknown>[] = [];
      if (gps.length) or.push({ activityType: { $in: gps } });
      if (include.includes('strength')) or.push(strengthMatch);
      if (include.includes('stretching')) or.push({ 'exercises.exerciseId': { $in: stretchExerciseIds() } });
      if (or.length) and.push({ $or: or });
    }
    if (exclude.length) {
      const gps = exclude.filter((a) => GPS_ACTIVITIES.has(a));
      // $nin also keeps docs missing activityType, so excluding a GPS type never
      // drops strength/stretching sessions.
      if (gps.length) and.push({ activityType: { $nin: gps } });
      if (exclude.includes('strength')) and.push({ $nor: [strengthMatch] });
      if (exclude.includes('stretching')) and.push({ 'exercises.exerciseId': { $nin: stretchExerciseIds() } });
    }
    if (and.length) query.$and = and;

    // Projection matches what SessionCard + the history page actually read.
    // Drops notes, templateId/Name, mode, activityType, endTime, gpsTrack(s),
    // and session-level gpsPreview — the list view uses only the per-exercise
    // gpsPreview for its polyline. Detail view hits a separate endpoint
    // (/api/fitness/sessions/[id]) which keeps the full document.
    const [sessions, total] = await Promise.all([
      WorkoutSession.find(query)
        .select(
          'name startTime duration totalVolume totalDistance prs kcalEstimate updatedAt ' +
          'exercises.exerciseId exercises.totalDistance exercises.gpsPreview exercises.sets'
        )
        .sort({ startTime: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      WorkoutSession.countDocuments(query)
    ]);

    return json({ sessions, total, limit, offset });
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return json({ error: 'Failed to fetch workout sessions' }, { status: 500 });
  }
};

// POST /api/fitness/sessions - Create a new workout session
export const POST: RequestHandler = async ({ request, locals }) => {
  const session = locals.session ?? await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const data = await request.json();
    const { templateId, name, mode, activityType, exercises, startTime, endTime, notes, gpsTrack, totalDistance: gpsDistance } = data;

    if (!name || (!exercises?.length && !gpsTrack?.length)) {
      return json({ error: 'Name and at least one exercise or GPS track required' }, { status: 400 });
    }

    let templateName;
    if (templateId) {
      const template = await WorkoutTemplate.findById(templateId);
      if (template) {
        templateName = template.name;
      }
    }

    // Compute totalVolume and totalDistance
    let totalVolume = 0;
    let totalDistance = gpsDistance ?? 0;
    for (const ex of (exercises ?? [])) {
      const exercise = getExerciseById(ex.exerciseId);
      const metrics = getExerciseMetrics(exercise);
      const isCardio = metrics.includes('distance');
      const isBilateral = exercise?.bilateral ?? false;
      for (const s of (ex.sets ?? [])) {
        if (!s.completed) continue;
        if (isCardio) {
          totalDistance += s.distance ?? 0;
        } else {
          totalVolume += (s.weight ?? 0) * (s.reps ?? 0) * (isBilateral ? 2 : 1);
        }
      }
    }

    // Detect PRs by comparing against previous best for each exercise
    const prs: IPr[] = [];
    for (const ex of (exercises ?? [])) {
      const exercise = getExerciseById(ex.exerciseId);
      const metrics = getExerciseMetrics(exercise);
      const isCardio = metrics.includes('distance');

      const completedSets = (ex.sets ?? []).filter((s: { completed: boolean }) => s.completed);
      if (completedSets.length === 0) continue;

      // Find previous best for this exercise
      const prevSessions = await WorkoutSession.find({
        createdBy: session.user!.nickname,
        'exercises.exerciseId': ex.exerciseId,
      }).sort({ startTime: -1 }).limit(50).lean();

      if (isCardio) {
        prs.push(...detectCardioPrs(ex.exerciseId, completedSets, prevSessions));
        continue;
      }

      const isBilateral = exercise?.bilateral ?? false;
      const weightMul = isBilateral ? 2 : 1;

      let prevBestWeight = 0;
      let prevBestEst1rm = 0;
      let prevBestVolume = 0;
      for (const ps of prevSessions) {
        const pe = ps.exercises.find((e) => e.exerciseId === ex.exerciseId);
        if (!pe) continue;
        for (const s of pe.sets) {
          if (!s.completed || !s.weight || !s.reps) continue;
          prevBestWeight = Math.max(prevBestWeight, s.weight);
          prevBestEst1rm = Math.max(prevBestEst1rm, estimatedOneRepMax(s.weight, s.reps));
          prevBestVolume = Math.max(prevBestVolume, s.weight * s.reps * weightMul);
        }
      }

      let bestWeight = 0;
      let bestEst1rm = 0;
      let bestVolume = 0;
      for (const s of completedSets) {
        if (!s.weight || !s.reps) continue;
        bestWeight = Math.max(bestWeight, s.weight);
        bestEst1rm = Math.max(bestEst1rm, estimatedOneRepMax(s.weight, s.reps));
        bestVolume = Math.max(bestVolume, s.weight * s.reps * weightMul);
      }

      if (bestWeight > prevBestWeight && prevBestWeight > 0) {
        prs.push({ exerciseId: ex.exerciseId, type: 'maxWeight', value: bestWeight });
      }
      if (bestEst1rm > prevBestEst1rm && prevBestEst1rm > 0) {
        prs.push({ exerciseId: ex.exerciseId, type: 'est1rm', value: bestEst1rm });
      }
      if (bestVolume > prevBestVolume && prevBestVolume > 0) {
        prs.push({ exerciseId: ex.exerciseId, type: 'bestSetVolume', value: Math.round(bestVolume) });
      }
    }

    // Generate GPS preview for top-level GPS track
    const gpsPreview = gpsTrack?.length >= 2 ? simplifyTrack(gpsTrack) : undefined;

    // Generate gpsPreview for exercise-level GPS tracks
    const processedExercises = (exercises ?? []).map((ex: any) => {
      if (ex.gpsTrack?.length >= 2 && !ex.gpsPreview) {
        return { ...ex, gpsPreview: simplifyTrack(ex.gpsTrack) };
      }
      return ex;
    });

    // Compute kcal estimate using best available method (GPS + demographics)
    const kcalEstimate = await computeSessionKcal(processedExercises, session.user.nickname);

    // Bounding box over all GPS points, for segment-match prefiltering.
    const gpsBbox = sessionBbox({ gpsTrack, exercises: processedExercises }) ?? undefined;

    const workoutSession = new WorkoutSession({
      templateId,
      templateName,
      name,
      mode: mode ?? (gpsTrack?.length ? 'gps' : 'manual'),
      activityType: activityType ?? undefined,
      exercises: processedExercises,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: endTime && startTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)) : undefined,
      totalVolume: totalVolume > 0 ? totalVolume : undefined,
      totalDistance: totalDistance > 0 ? totalDistance : undefined,
      gpsTrack: gpsTrack?.length ? gpsTrack : undefined,
      gpsPreview,
      gpsBbox,
      prs: prs.length > 0 ? prs : undefined,
      kcalEstimate,
      notes,
      createdBy: session.user.nickname
    });

    await workoutSession.save();

    // Advance the workout-schedule rotation pointer (best-effort).
    if (templateId) {
      try {
        await advanceSchedulePointer(session.user.nickname, String(templateId));
      } catch (err) {
        console.error('Schedule pointer update failed:', err);
      }
    }

    // Match against segments (never fail the save on a matching error).
    let segmentAchievements;
    try {
      segmentAchievements = await matchSessionAgainstAllSegments(workoutSession);
    } catch (err) {
      console.error('Segment matching failed:', err);
    }

    // Feed the run into the auto-detect grid (best-effort).
    try {
      await addRunToGrid(session.user.nickname, String(workoutSession._id), {
        gpsTrack,
        exercises: processedExercises
      });
    } catch (err) {
      console.error('Segment grid update failed:', err);
    }

    return json({ session: workoutSession, segmentAchievements }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return json({ error: 'Failed to create workout session' }, { status: 500 });
  }
};