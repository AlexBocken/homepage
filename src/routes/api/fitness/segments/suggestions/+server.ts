import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { suggestSegments, suggestSegmentsForRun } from '$lib/server/segmentSuggest';
import mongoose from 'mongoose';

// GET /api/fitness/segments/suggestions — auto-detected segment candidates from
// the caller's popular grid cells (stitched + deduped against existing segments).
// With ?sessionId=<id>, only candidates found within that run (indices map to it).
export const GET: RequestHandler = async ({ url, locals }) => {
  const session = locals.session ?? (await locals.auth());
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const sessionId = url.searchParams.get('sessionId');
    const suggestions =
      sessionId && mongoose.Types.ObjectId.isValid(sessionId)
        ? await suggestSegmentsForRun(session.user.nickname, sessionId)
        : await suggestSegments(session.user.nickname);
    return json({ suggestions });
  } catch (error) {
    console.error('Error computing segment suggestions:', error);
    return json({ error: 'Failed to compute suggestions' }, { status: 500 });
  }
};
