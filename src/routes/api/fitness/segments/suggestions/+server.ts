import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { suggestSegments, suggestSegmentsForRun } from '$lib/server/segmentSuggest';
import { requireAuth } from '$lib/server/middleware/auth';
import mongoose from 'mongoose';

// GET /api/fitness/segments/suggestions — auto-detected segment candidates from
// the caller's popular grid cells (stitched + deduped against existing segments).
// With ?sessionId=<id>, only candidates found within that run (indices map to it).
export const GET: RequestHandler = async ({ url, locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();
    const sessionId = url.searchParams.get('sessionId');
    const suggestions =
      sessionId && mongoose.Types.ObjectId.isValid(sessionId)
        ? await suggestSegmentsForRun(user.nickname, sessionId)
        : await suggestSegments(user.nickname);
    return json({ suggestions });
  } catch (error) {
    console.error('Error computing segment suggestions:', error);
    return json({ error: 'Failed to compute suggestions' }, { status: 500 });
  }
};
