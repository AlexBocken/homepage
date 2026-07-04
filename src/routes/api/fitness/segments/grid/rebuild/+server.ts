import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { rebuildGridForUser } from '$lib/server/segmentGrid';
import { requireAuth } from '$lib/server/middleware/auth';

// POST /api/fitness/segments/grid/rebuild — wipe + rebuild the caller's
// auto-detect grid from their GPS-run history. Idempotent; safe to re-run.
export const POST: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();
    const result = await rebuildGridForUser(user.nickname);
    return json(result);
  } catch (error) {
    console.error('Error rebuilding segment grid:', error);
    return json({ error: 'Failed to rebuild grid' }, { status: 500 });
  }
};
