import type { RequestHandler } from '@sveltejs/kit';
import { TaskCompletion } from '$models/TaskCompletion';
import { dbConnect } from '$utils/db';
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
  await requireAuth(locals);

  await dbConnect();

  const [userStats, userStickers, recentCompletions] = await Promise.all([
    TaskCompletion.aggregate([
      { $group: { _id: '$completedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    TaskCompletion.aggregate([
      { $match: { stickerId: { $exists: true, $ne: null } } },
      { $group: { _id: { user: '$completedBy', sticker: '$stickerId' }, count: { $sum: 1 } } },
      { $sort: { '_id.user': 1, count: -1 } }
    ]),
    TaskCompletion.find().sort({ completedAt: -1 }).limit(500).lean()
  ]);

  return json({ userStats, userStickers, recentCompletions });
};

export const DELETE: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);

  await dbConnect();

  const { deletedCount } = await TaskCompletion.deleteMany({ completedBy: user.nickname });

  return json({ deletedCount });
};
