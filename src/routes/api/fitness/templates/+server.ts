import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { requireAuth } from '$lib/server/middleware/auth';

// GET /api/fitness/templates - Get all workout templates for the user
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();

    const includePublic = url.searchParams.get('include_public') === 'true';

    const orConditions: Record<string, unknown>[] = [
      { createdBy: user.nickname }
    ];

    if (includePublic) {
      orConditions.push({ isPublic: true });
    }

    const query = { $or: orConditions };

    // Alphabetical by name; collation makes it case-insensitive rather than
    // byte-order (which would put every uppercase name before every lowercase one).
    const templates = await WorkoutTemplate.find(query)
      .collation({ locale: 'en', strength: 1 })
      .sort({ name: 1 });
    
    return json({ templates });
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    return json({ error: 'Failed to fetch workout templates' }, { status: 500 });
  }
};

// POST /api/fitness/templates - Create a new workout template
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();
    
    const data = await request.json();
    const { name, description, exercises, isPublic = false, mode = 'manual', activityType, intervalTemplateId } = data;

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

    const template = new WorkoutTemplate({
      name,
      description,
      mode,
      ...(isGps ? { activityType, intervalTemplateId } : {}),
      exercises: exercises ?? [],
      isPublic,
      createdBy: user.nickname
    });

    await template.save();
    
    return json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout template:', error);
    return json({ error: 'Failed to create workout template' }, { status: 500 });
  }
};