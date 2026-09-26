import type { RequestHandler } from '@sveltejs/kit';
import { Task } from '$models/Task';
import { dbConnect } from '$utils/db';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
  await requireAuth(locals);

  await dbConnect();

  const tasks = await Task.find({ active: true })
    .sort({ nextDueDate: 1 })
    .lean();

  return json({ tasks });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);

  const data = await request.json();
  const { title, description, assignees, tags, difficulty, refreshMode, isRecurring, frequency, nextDueDate } = data;

  if (!title?.trim()) throw error(400, 'Title is required');
  if (!nextDueDate) throw error(400, 'Due date is required');
  if (isRecurring && !frequency?.type) throw error(400, 'Frequency is required for recurring tasks');

  await dbConnect();

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim(),
    assignees: assignees || [],
    tags: tags || [],
    difficulty: difficulty || undefined,
    refreshMode: isRecurring ? (refreshMode || 'completion') : undefined,
    isRecurring: !!isRecurring,
    frequency: isRecurring ? frequency : undefined,
    nextDueDate: new Date(nextDueDate),
    createdBy: user.nickname,
    active: true
  });

  return json({ task }, { status: 201 });
};
