import type { RequestHandler } from '@sveltejs/kit';
import { TaskCompletion } from '$models/TaskCompletion';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const auth = await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  await dbConnect();

  const completion = await TaskCompletion.findById(params.id);
  if (!completion) throw error(404, 'Completion not found');

  if (completion.completedBy !== auth.user.nickname) {
    throw error(403, 'You can only delete your own completions');
  }

  await completion.deleteOne();

  return json({ success: true });
};
