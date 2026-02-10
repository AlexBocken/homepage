import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import mongoose from 'mongoose';

// GET /api/fitness/templates/[id] - Get a specific workout template
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await WorkoutTemplate.findOne({
      _id: params.id,
      $or: [
        { createdBy: session.user.nickname },
        { isPublic: true }
      ]
    });

    if (!template) {
      return json({ error: 'Template not found' }, { status: 404 });
    }

    return json({ template });
  } catch (error) {
    console.error('Error fetching workout template:', error);
    return json({ error: 'Failed to fetch workout template' }, { status: 500 });
  }
};

// PUT /api/fitness/templates/[id] - Update a workout template
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const data = await request.json();
    const { name, description, exercises, isPublic } = data;

    if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return json({ error: 'Name and at least one exercise are required' }, { status: 400 });
    }

    // Validate exercises structure
    for (const exercise of exercises) {
      if (!exercise.name || !exercise.sets || !Array.isArray(exercise.sets) || exercise.sets.length === 0) {
        return json({ error: 'Each exercise must have a name and at least one set' }, { status: 400 });
      }
      
      for (const set of exercise.sets) {
        if (!set.reps || typeof set.reps !== 'number' || set.reps < 1) {
          return json({ error: 'Each set must have valid reps (minimum 1)' }, { status: 400 });
        }
      }
    }

    const template = await WorkoutTemplate.findOneAndUpdate(
      {
        _id: params.id,
        createdBy: session.user.nickname // Only allow users to edit their own templates
      },
      {
        name,
        description,
        exercises,
        isPublic
      },
      { new: true }
    );

    if (!template) {
      return json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return json({ template });
  } catch (error) {
    console.error('Error updating workout template:', error);
    return json({ error: 'Failed to update workout template' }, { status: 500 });
  }
};

// DELETE /api/fitness/templates/[id] - Delete a workout template
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await WorkoutTemplate.findOneAndDelete({
      _id: params.id,
      createdBy: session.user.nickname // Only allow users to delete their own templates
    });

    if (!template) {
      return json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout template:', error);
    return json({ error: 'Failed to delete workout template' }, { status: 500 });
  }
};