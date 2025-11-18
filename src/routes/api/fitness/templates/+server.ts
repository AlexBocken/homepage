import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '../../../../models/WorkoutTemplate';

// GET /api/fitness/templates - Get all workout templates for the user
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const includePublic = url.searchParams.get('include_public') === 'true';
    
    let query: any = {
      $or: [
        { createdBy: session.user.nickname }
      ]
    };

    if (includePublic) {
      query.$or.push({ isPublic: true });
    }

    const templates = await WorkoutTemplate.find(query).sort({ updatedAt: -1 });
    
    return json({ templates });
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    return json({ error: 'Failed to fetch workout templates' }, { status: 500 });
  }
};

// POST /api/fitness/templates - Create a new workout template
export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const data = await request.json();
    const { name, description, exercises, isPublic = false } = data;

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

    const template = new WorkoutTemplate({
      name,
      description,
      exercises,
      isPublic,
      createdBy: session.user.nickname
    });

    await template.save();
    
    return json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout template:', error);
    return json({ error: 'Failed to create workout template' }, { status: 500 });
  }
};