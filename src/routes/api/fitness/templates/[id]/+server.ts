import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { requireAuth } from '$lib/server/middleware/auth';
import { assertObjectId } from '$lib/server/ownedResource';

// GET /api/fitness/templates/[id] - Get a specific workout template
export const GET: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const template = await WorkoutTemplate.findOne({
      _id: params.id,
      $or: [
        { createdBy: user.nickname },
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
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const data = await request.json();
    const { name, description, exercises, isPublic, mode = 'manual', activityType, intervalTemplateId } = data;

    const isGps = mode === 'gps';

    if (!name) {
      return json({ error: 'Name is required' }, { status: 400 });
    }

    if (!isGps && (!exercises || !Array.isArray(exercises) || exercises.length === 0)) {
      return json({ error: 'At least one exercise is required' }, { status: 400 });
    }

    // Validate exercises structure
    if (exercises && Array.isArray(exercises)) {
      for (const exercise of exercises) {
        if (!exercise.exerciseId) {
          return json({ error: 'Each exercise must have an exerciseId' }, { status: 400 });
        }
      }
    }

    const template = await WorkoutTemplate.findOneAndUpdate(
      {
        _id: params.id,
        createdBy: user.nickname
      },
      {
        name,
        description,
        mode,
        activityType: isGps ? activityType : undefined,
        intervalTemplateId: isGps ? intervalTemplateId : undefined,
        exercises: exercises ?? [],
        isPublic
      },
      { returnDocument: 'after' }
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
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const template = await WorkoutTemplate.findOneAndDelete({
      _id: params.id,
      createdBy: user.nickname // Only allow users to delete their own templates
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