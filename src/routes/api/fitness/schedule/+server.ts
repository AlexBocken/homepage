import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSchedule } from '$models/WorkoutSchedule';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { getNextScheduledTemplate } from '$lib/server/workoutSchedule';
import { requireAuth } from '$lib/server/middleware/auth';

// GET /api/fitness/schedule - Get the user's workout schedule and next workout
export const GET: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();

    return json(await getNextScheduledTemplate(user.nickname));
  } catch (error) {
    console.error('Error fetching workout schedule:', error);
    return json({ error: 'Failed to fetch workout schedule' }, { status: 500 });
  }
};

// PUT /api/fitness/schedule - Save the user's workout schedule (template order)
export const PUT: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();

    const { templateOrder } = await request.json();

    if (!Array.isArray(templateOrder)) {
      return json({ error: 'templateOrder must be an array' }, { status: 400 });
    }

    // Validate all template IDs belong to this user. A template may legitimately
    // appear more than once, so validate the distinct ids against the doc count.
    const uniqueIds = [...new Set(templateOrder)];
    if (uniqueIds.length > 0) {
      const count = await WorkoutTemplate.countDocuments({
        _id: { $in: uniqueIds },
        createdBy: user.nickname
      });
      if (count !== uniqueIds.length) {
        return json({ error: 'Some template IDs are invalid' }, { status: 400 });
      }
    }

    // Preserve the rotation pointer across edits (GET clamps it to the new
    // length); only seed it on first creation.
    const schedule = await WorkoutSchedule.findOneAndUpdate(
      { userId: user.nickname },
      { $set: { templateOrder }, $setOnInsert: { position: 0 } },
      { upsert: true, returnDocument: 'after' }
    );

    return json({ schedule: { templateOrder: schedule.templateOrder } });
  } catch (error) {
    console.error('Error saving workout schedule:', error);
    return json({ error: 'Failed to save workout schedule' }, { status: 500 });
  }
};
