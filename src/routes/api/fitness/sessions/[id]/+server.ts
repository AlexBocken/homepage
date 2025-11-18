import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '../../../../../models/WorkoutSession';
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
    const { name, exercises, startTime, endTime, notes } = data;

    if (exercises && (!Array.isArray(exercises) || exercises.length === 0)) {
      return json({ error: 'At least one exercise is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (exercises) updateData.exercises = exercises;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;

    // Calculate duration if both times are provided
    if (updateData.startTime && updateData.endTime) {
      updateData.duration = Math.round((updateData.endTime.getTime() - updateData.startTime.getTime()) / (1000 * 60));
    }

    const workoutSession = await WorkoutSession.findOneAndUpdate(
      {
        _id: params.id,
        createdBy: session.user.nickname
      },
      updateData,
      { new: true }
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