import type { RequestHandler } from '@sveltejs/kit';
import { TaskCompletion } from '$models/TaskCompletion';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const user = await requireAuth(locals);

  await dbConnect();

  const completion = await TaskCompletion.findById(params.id);
  if (!completion) throw error(404, 'Completion not found');

  if (completion.completedBy !== user.nickname) {
    throw error(403, 'You can only edit your own completions');
  }

  const body = await request.json().catch(() => ({}));

  if (body.completedAt !== undefined) {
    const d = new Date(body.completedAt);
    if (isNaN(d.getTime())) throw error(400, 'Invalid date');
    completion.completedAt = d;
  }
  if (typeof body.stickerId === 'string' && body.stickerId) {
    completion.stickerId = body.stickerId;
  }

  await completion.save();

  return json({ completion });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  await dbConnect();

  const completion = await TaskCompletion.findById(params.id);
  if (!completion) throw error(404, 'Completion not found');

  if (completion.completedBy !== user.nickname) {
    throw error(403, 'You can only delete your own completions');
  }

  await completion.deleteOne();

  return json({ success: true });
};
