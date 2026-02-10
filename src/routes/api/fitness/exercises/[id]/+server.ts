import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Exercise } from '$models/Exercise';

// GET /api/fitness/exercises/[id] - Get detailed exercise information
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const exercise = await Exercise.findOne({ 
      exerciseId: params.id,
      isActive: true 
    });

    if (!exercise) {
      return json({ error: 'Exercise not found' }, { status: 404 });
    }

    return json({ exercise });
  } catch (error) {
    console.error('Error fetching exercise details:', error);
    return json({ error: 'Failed to fetch exercise details' }, { status: 500 });
  }
};