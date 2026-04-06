import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import mongoose from 'mongoose';

// GET /api/fitness/sessions/[id] - Get a specific workout session
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const workoutSession = await WorkoutSession.findOne({
      _id: params.id,
      createdBy: session.user.nickname
    });

    if (!workoutSession) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    return json({ session: workoutSession });
  } catch (error) {
    console.error('Error fetching workout session:', error);
    return json({ error: 'Failed to fetch workout session' }, { status: 500 });
  }
};

// PUT /api/fitness/sessions/[id] - Update a workout session
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const data = await request.json();
    const { name, exercises, startTime, endTime, duration, notes } = data;

    if (exercises && (!Array.isArray(exercises) || exercises.length === 0)) {
      return json({ error: 'At least one exercise is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (exercises) {
      // Preserve gpsTrack/gpsPreview/totalDistance from existing exercises
      const existing = await WorkoutSession.findOne({
        _id: params.id,
        createdBy: session.user.nickname
      }).select('exercises.exerciseId exercises.gpsTrack exercises.gpsPreview exercises.totalDistance').lean();

      const gpsDataByExercise = new Map<string, { gpsTrack?: unknown; gpsPreview?: unknown; totalDistance?: number }>();
      if (existing) {
        for (const ex of existing.exercises) {
          if (ex.gpsTrack?.length || ex.gpsPreview?.length || ex.totalDistance) {
            gpsDataByExercise.set(ex.exerciseId, {
              gpsTrack: ex.gpsTrack,
              gpsPreview: ex.gpsPreview,
              totalDistance: ex.totalDistance
            });
          }
        }
      }

      updateData.exercises = exercises.map((ex: Record<string, unknown>) => {
        const gps = gpsDataByExercise.get(ex.exerciseId as string);
        return gps ? { ...ex, ...gps } : ex;
      });

      // Recompute totalVolume
      let totalVolume = 0;
      let totalDistance = 0;
      for (const ex of exercises) {
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
      updateData.totalVolume = totalVolume > 0 ? totalVolume : undefined;
      updateData.totalDistance = totalDistance > 0 ? totalDistance : undefined;
    }
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (duration !== undefined) updateData.duration = duration;
    if (notes !== undefined) updateData.notes = notes;

    // Calculate duration from times if both provided but duration wasn't explicit
    if (updateData.startTime && updateData.endTime && duration === undefined) {
      updateData.duration = Math.round(((updateData.endTime as Date).getTime() - (updateData.startTime as Date).getTime()) / (1000 * 60));
    }

    const workoutSession = await WorkoutSession.findOneAndUpdate(
      {
        _id: params.id,
        createdBy: session.user.nickname
      },
      updateData,
      { returnDocument: 'after' }
    );

    if (!workoutSession) {
      return json({ error: 'Session not found or unauthorized' }, { status: 404 });
    }

    return json({ session: workoutSession });
  } catch (error) {
    console.error('Error updating workout session:', error);
    return json({ error: 'Failed to update workout session' }, { status: 500 });
  }
};

// DELETE /api/fitness/sessions/[id] - Delete a workout session
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const workoutSession = await WorkoutSession.findOneAndDelete({
      _id: params.id,
      createdBy: session.user.nickname
    });

    if (!workoutSession) {
      return json({ error: 'Session not found or unauthorized' }, { status: 404 });
    }

    return json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout session:', error);
    return json({ error: 'Failed to delete workout session' }, { status: 500 });
  }
};