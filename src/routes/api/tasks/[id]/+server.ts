import type { RequestHandler } from '@sveltejs/kit';
import { Task } from '$models/Task';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const data = await request.json();
  const { title, description, assignees, tags, difficulty, refreshMode, isRecurring, frequency, nextDueDate, active } = data;

  await dbConnect();

  const task = await Task.findById(params.id);
  if (!task) throw error(404, 'Task not found');

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description?.trim();
  if (assignees !== undefined) task.assignees = assignees;
  if (tags !== undefined) task.tags = tags;
  if (difficulty !== undefined) task.difficulty = difficulty || undefined;
  if (refreshMode !== undefined) task.refreshMode = refreshMode || 'completion';
  if (isRecurring !== undefined) {
    task.isRecurring = isRecurring;
    task.frequency = isRecurring ? frequency : undefined;
  }
  if (nextDueDate !== undefined) task.nextDueDate = new Date(nextDueDate);
  if (active !== undefined) task.active = active;

  await task.save();
  return json({ task });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  await dbConnect();

  const task = await Task.findById(params.id);
  if (!task) throw error(404, 'Task not found');

  // Soft delete
  task.active = false;
  await task.save();

  return json({ success: true });
};
