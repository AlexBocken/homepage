import { json, error, type RequestHandler } from '@sveltejs/kit';
import { RosaryStreak } from '$models/RosaryStreak';
import { dbConnect } from '$utils/db';

export const GET: RequestHandler = async ({ locals }) => {
  const session = locals.session ?? await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  await dbConnect();

  try {
    const streak = await RosaryStreak.findOne({
      username: session.user.nickname
    }).lean() as any;

    return json({
      length: streak?.length ?? 0,
      lastPrayed: streak?.lastPrayed ?? null,
      lastPrayedTs: streak?.lastPrayedTs ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to fetch rosary streak');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = locals.session ?? await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { length, lastPrayed, lastPrayedTs } = await request.json();

  if (typeof length !== 'number' || length < 0) {
    throw error(400, 'Valid streak length required');
  }

  if (lastPrayed !== null && typeof lastPrayed !== 'string') {
    throw error(400, 'Invalid lastPrayed format');
  }

  await dbConnect();

  try {
    const updateFields: Record<string, unknown> = { length, lastPrayed };
    if (typeof lastPrayedTs === 'number') {
      updateFields.lastPrayedTs = lastPrayedTs;
    }

    const updated = await RosaryStreak.findOneAndUpdate(
      { username: session.user.nickname },
      updateFields,
      { upsert: true, returnDocument: 'after' }
    ).lean() as any;

    return json({
      length: updated?.length ?? 0,
      lastPrayed: updated?.lastPrayed ?? null,
      lastPrayedTs: updated?.lastPrayedTs ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to update rosary streak');
  }
};
