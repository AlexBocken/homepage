import { json, error, type RequestHandler } from '@sveltejs/kit';
import { RosaryStreak } from '../../../../models/RosaryStreak';
import { dbConnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  await dbConnect();

  try {
    const streak = await RosaryStreak.findOne({
      username: session.user.nickname
    }).lean();

    return json({
      length: streak?.length ?? 0,
      lastPrayed: streak?.lastPrayed ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to fetch rosary streak');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { length, lastPrayed } = await request.json();

  if (typeof length !== 'number' || length < 0) {
    throw error(400, 'Valid streak length required');
  }

  if (lastPrayed !== null && typeof lastPrayed !== 'string') {
    throw error(400, 'Invalid lastPrayed format');
  }

  await dbConnect();

  try {
    const updated = await RosaryStreak.findOneAndUpdate(
      { username: session.user.nickname },
      { length, lastPrayed },
      { upsert: true, new: true }
    ).lean();

    return json({
      length: updated.length,
      lastPrayed: updated.lastPrayed
    });
  } catch (e) {
    throw error(500, 'Failed to update rosary streak');
  }
};
