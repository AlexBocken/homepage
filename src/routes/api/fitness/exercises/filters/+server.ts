import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Exercise } from '$models/Exercise';

// GET /api/fitness/exercises/filters - Get available filter options
export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  const session = locals.session ?? await locals.auth();
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

    // Auth-gated but identical for every user. `private` keeps it out of any
    // shared cache (auth headers vary per user) while still letting the
    // browser reuse the response for 1 h — the filter picker is opened
    // repeatedly during a single session.
    setHeaders({ 'Cache-Control': 'private, max-age=3600' });

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