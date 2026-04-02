import type { RequestHandler } from '@sveltejs/kit';
import { Task } from '$models/Task';
import { TaskCompletion } from '$models/TaskCompletion';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import { getStickerForTags } from '$lib/utils/stickers';
import { addDays } from 'date-fns';

function getNextDueDate(completedAt: Date, frequencyType: string, customDays?: number): Date {
  switch (frequencyType) {
    case 'daily': return addDays(completedAt, 1);
    case 'weekly': return addDays(completedAt, 7);
    case 'biweekly': return addDays(completedAt, 14);
    case 'monthly': {
      const next = new Date(completedAt);
      next.setMonth(next.getMonth() + 1);
      return next;
    }
    case 'custom': return addDays(completedAt, customDays || 7);
    default: return addDays(completedAt, 7);
  }
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const auth = await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  await dbConnect();

  const task = await Task.findById(params.id);
  if (!task) throw error(404, 'Task not found');
  if (!task.active) throw error(400, 'Task is archived');

  // Allow completing on behalf of another user
  const body = await request.json().catch(() => ({}));
  const completedFor = body.completedFor || auth.user.nickname;

  const now = new Date();

  // Award a sticker based on task tags and difficulty
  const sticker = getStickerForTags(task.tags, task.difficulty || 'medium');

  // Record the completion
  const completion = await TaskCompletion.create({
    taskId: task._id,
    taskTitle: task.title,
    completedBy: completedFor,
    completedAt: now,
    stickerId: sticker.id,
    tags: task.tags
  });

  // Update task
  task.lastCompletedAt = now;
  task.lastCompletedBy = completedFor;

  if (task.isRecurring && task.frequency) {
    // 'planned': calculate from the original due date (catches up if overdue)
    // 'completion' (default): calculate from now
    const baseDate = task.refreshMode === 'planned' ? task.nextDueDate : now;
    let next = getNextDueDate(baseDate, task.frequency.type, task.frequency.customDays);
    // If planned mode produced a date in the past, keep advancing until it's in the future
    while (task.refreshMode === 'planned' && next <= now) {
      next = getNextDueDate(next, task.frequency.type, task.frequency.customDays);
    }
    task.nextDueDate = next;
  } else {
    // One-off task: deactivate
    task.active = false;
  }

  await task.save();

  return json({ completion, sticker, task });
};
