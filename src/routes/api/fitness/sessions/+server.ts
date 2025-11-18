import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '../../../../models/WorkoutSession';
import { WorkoutTemplate } from '../../../../models/WorkoutTemplate';

// GET /api/fitness/sessions - Get all workout sessions for the user
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const sessions = await WorkoutSession.find({ createdBy: session.user.nickname })
      .sort({ startTime: -1 })
      .limit(limit)
      .skip(offset);
    
    const total = await WorkoutSession.countDocuments({ createdBy: session.user.nickname });
    
    return json({ sessions, total, limit, offset });
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return json({ error: 'Failed to fetch workout sessions' }, { status: 500 });
  }
};

// POST /api/fitness/sessions - Create a new workout session
export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const data = await request.json();
    const { templateId, name, exercises, startTime, endTime, notes } = data;

    if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return json({ error: 'Name and at least one exercise are required' }, { status: 400 });
    }

    let templateName;
    if (templateId) {
      const template = await WorkoutTemplate.findById(templateId);
      if (template) {
        templateName = template.name;
      }
    }

    const workoutSession = new WorkoutSession({
      templateId,
      templateName,
      name,
      exercises,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: endTime && startTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)) : undefined,
      notes,
      createdBy: session.user.nickname
    });

    await workoutSession.save();
    
    return json({ session: workoutSession }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return json({ error: 'Failed to create workout session' }, { status: 500 });
  }
};