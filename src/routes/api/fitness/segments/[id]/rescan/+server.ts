import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Segment } from '$models/Segment';
import { backfillSegment } from '$lib/server/segments';
import mongoose from 'mongoose';

// POST /api/fitness/segments/[id]/rescan — re-run the backfill for a segment
// against history (creator only). Idempotent: rebuilds the segment's efforts.
export const POST: RequestHandler = async ({ params, locals }) => {
  const session = locals.session ?? (await locals.auth());
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return json({ error: 'Invalid segment ID' }, { status: 400 });
    }

    const segment = await Segment.findById(params.id).lean();
    if (!segment) return json({ error: 'Segment not found' }, { status: 404 });
    if (segment.createdBy !== session.user.nickname) {
      return json({ error: 'Only the creator can rescan' }, { status: 403 });
    }

    const effortCount = await backfillSegment(segment);
    return json({ effortCount });
  } catch (error) {
    console.error('Error rescanning segment:', error);
    return json({ error: 'Failed to rescan segment' }, { status: 500 });
  }
};
