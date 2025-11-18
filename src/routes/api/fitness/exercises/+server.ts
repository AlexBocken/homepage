import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Exercise } from '../../../../models/Exercise';

// GET /api/fitness/exercises - Search and filter exercises
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    // Query parameters
    const search = url.searchParams.get('search') || '';
    const bodyPart = url.searchParams.get('bodyPart') || '';
    const equipment = url.searchParams.get('equipment') || '';
    const target = url.searchParams.get('target') || '';
    const difficulty = url.searchParams.get('difficulty') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query: any = { isActive: true };
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filters
    if (bodyPart) query.bodyPart = bodyPart.toLowerCase();
    if (equipment) query.equipment = equipment.toLowerCase();
    if (target) query.target = target.toLowerCase();
    if (difficulty) query.difficulty = difficulty.toLowerCase();

    // Execute query
    let exerciseQuery = Exercise.find(query);
    
    // Sort by relevance if searching, otherwise alphabetically
    if (search) {
      exerciseQuery = exerciseQuery.sort({ score: { $meta: 'textScore' } });
    } else {
      exerciseQuery = exerciseQuery.sort({ name: 1 });
    }
    
    const exercises = await exerciseQuery
      .limit(limit)
      .skip(offset)
      .select('exerciseId name gifUrl bodyPart equipment target difficulty');
    
    const total = await Exercise.countDocuments(query);
    
    return json({ exercises, total, limit, offset });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
};

// GET /api/fitness/exercises/filters - Get available filter options
export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const [bodyParts, equipment, targets] = await Promise.all([
      Exercise.distinct('bodyPart', { isActive: true }),
      Exercise.distinct('equipment', { isActive: true }),
      Exercise.distinct('target', { isActive: true })
    ]);
    
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    
    return json({
      bodyParts: bodyParts.sort(),
      equipment: equipment.sort(),
      targets: targets.sort(),
      difficulties
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return json({ error: 'Failed to fetch filter options' }, { status: 500 });
  }
};