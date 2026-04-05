import { json, error, type RequestHandler } from '@sveltejs/kit';
import { AngelusStreak } from '$models/AngelusStreak';
import { dbConnect } from '$utils/db';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  await dbConnect();

  try {
    const streak = await AngelusStreak.findOne({
      username: session.user.nickname
    }).lean() as any;

    return json({
      streak: streak?.streak ?? 0,
      lastComplete: streak?.lastComplete ?? null,
      lastCompleteTs: streak?.lastCompleteTs ?? null,
      todayPrayed: streak?.todayPrayed ?? 0,
      todayDate: streak?.todayDate ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to fetch angelus streak');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }

  const { streak, lastComplete, lastCompleteTs, todayPrayed, todayDate } = await request.json();

  if (typeof streak !== 'number' || streak < 0) {
    throw error(400, 'Valid streak required');
  }

  if (lastComplete !== null && typeof lastComplete !== 'string') {
    throw error(400, 'Invalid lastComplete format');
  }

  if (typeof todayPrayed !== 'number' || todayPrayed < 0 || todayPrayed > 7) {
    throw error(400, 'Invalid todayPrayed bitmask');
  }

  if (todayDate !== null && typeof todayDate !== 'string') {
    throw error(400, 'Invalid todayDate format');
  }

  await dbConnect();

  try {
    const updateFields: Record<string, unknown> = { streak, lastComplete, todayPrayed, todayDate };
    if (typeof lastCompleteTs === 'number') {
      updateFields.lastCompleteTs = lastCompleteTs;
    }

    const updated = await AngelusStreak.findOneAndUpdate(
      { username: session.user.nickname },
      updateFields,
      { upsert: true, new: true }
    ).lean() as any;

    return json({
      streak: updated?.streak ?? 0,
      lastComplete: updated?.lastComplete ?? null,
      lastCompleteTs: updated?.lastCompleteTs ?? null,
      todayPrayed: updated?.todayPrayed ?? 0,
      todayDate: updated?.todayDate ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to update angelus streak');
  }
};
