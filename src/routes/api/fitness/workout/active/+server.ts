import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { ActiveWorkout } from '$models/ActiveWorkout';
import { broadcast } from '$lib/server/sseManager';

// GET /api/fitness/workout/active — fetch current active workout
export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const doc = await ActiveWorkout.findOne({ userId: session.user.nickname }).lean();
    if (!doc) {
      return json({ active: false });
    }
    return json({ active: true, workout: doc });
  } catch (error) {
    console.error('Error fetching active workout:', error);
    return json({ error: 'Failed to fetch active workout' }, { status: 500 });
  }
};

// PUT /api/fitness/workout/active — create or update active workout state
export const PUT: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const data = await request.json();
    const { name, templateId, exercises, paused, elapsed, savedAt, expectedVersion, restStartedAt, restTotal } = data;

    if (!name) {
      return json({ error: 'Name is required' }, { status: 400 });
    }

    const userId = session.user.nickname;
    const existing = await ActiveWorkout.findOne({ userId });

    if (existing && expectedVersion != null && existing.version !== expectedVersion) {
      // Conflict — client is out of date
      return json(
        { error: 'Version conflict', workout: existing },
        { status: 409 }
      );
    }

    const newVersion = existing ? existing.version + 1 : 1;

    const doc = await ActiveWorkout.findOneAndUpdate(
      { userId },
      {
        $set: {
          name,
          templateId: templateId ?? null,
          exercises: exercises ?? [],
          paused: paused ?? false,
          elapsed: elapsed ?? 0,
          savedAt: savedAt ?? Date.now(),
          restStartedAt: restStartedAt ?? null,
          restTotal: restTotal ?? 0,
          version: newVersion
        },
        $setOnInsert: { userId }
      },
      { upsert: true, new: true, lean: true }
    );

    // Broadcast to all other connected devices
    broadcast(userId, 'update', doc);

    return json({ workout: doc });
  } catch (error) {
    console.error('Error updating active workout:', error);
    return json({ error: 'Failed to update active workout' }, { status: 500 });
  }
};

// DELETE /api/fitness/workout/active — clear active workout (finish/cancel)
export const DELETE: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = session.user.nickname;
    await ActiveWorkout.deleteOne({ userId });

    // Notify all devices that workout is finished
    broadcast(userId, 'finished', { active: false });

    return json({ ok: true });
  } catch (error) {
    console.error('Error deleting active workout:', error);
    return json({ error: 'Failed to delete active workout' }, { status: 500 });
  }
};
