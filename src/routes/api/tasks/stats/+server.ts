import type { RequestHandler } from '@sveltejs/kit';
import { TaskCompletion } from '$models/TaskCompletion';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const auth = await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  await dbConnect();

  // Completions per user
  const userStats = await TaskCompletion.aggregate([
    { $group: { _id: '$completedBy', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Stickers per user
  const userStickers = await TaskCompletion.aggregate([
    { $match: { stickerId: { $exists: true, $ne: null } } },
    { $group: { _id: { user: '$completedBy', sticker: '$stickerId' }, count: { $sum: 1 } } },
    { $sort: { '_id.user': 1, count: -1 } }
  ]);

  // Recent completions (enough for ~3 months of calendar)
  const recentCompletions = await TaskCompletion.find()
    .sort({ completedAt: -1 })
    .limit(500)
    .lean();

  return json({ userStats, userStickers, recentCompletions });
};
