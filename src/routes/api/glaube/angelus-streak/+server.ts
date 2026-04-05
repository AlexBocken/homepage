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

  const { streak, lastComplete, todayPrayed, todayDate } = await request.json();

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
    const updated = await AngelusStreak.findOneAndUpdate(
      { username: session.user.nickname },
      { streak, lastComplete, todayPrayed, todayDate },
      { upsert: true, new: true }
    ).lean() as any;

    return json({
      streak: updated?.streak ?? 0,
      lastComplete: updated?.lastComplete ?? null,
      todayPrayed: updated?.todayPrayed ?? 0,
      todayDate: updated?.todayDate ?? null
    });
  } catch (e) {
    throw error(500, 'Failed to update angelus streak');
  }
};
