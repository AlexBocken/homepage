import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { WorkoutSchedule } from '$models/WorkoutSchedule';
import { WorkoutSession } from '$models/WorkoutSession';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { requireAuth } from '$lib/server/middleware/auth';

// GET /api/fitness/schedule - Get the user's workout schedule and next workout
export const GET: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);

  try {
    await dbConnect();

    const schedule = await WorkoutSchedule.findOne({ userId: user.nickname });

    if (!schedule || schedule.templateOrder.length === 0) {
      return json({ schedule: null, nextTemplateId: null });
    }

    // Find the most recent session that used a template in the schedule
    const lastSession = await WorkoutSession.findOne({
      createdBy: user.nickname,
      templateId: { $in: schedule.templateOrder }
    }).sort({ startTime: -1 });

    let nextTemplateId: string;

    if (!lastSession?.templateId) {
      // No previous session — start at the first template
      nextTemplateId = schedule.templateOrder[0];
    } else {
      const lastId = lastSession.templateId.toString();
      const idx = schedule.templateOrder.indexOf(lastId);
      if (idx === -1) {
        // Last session's template no longer in schedule — start at first
        nextTemplateId = schedule.templateOrder[0];
      } else {
        // Next in rotation (wraps around)
        nextTemplateId = schedule.templateOrder[(idx + 1) % schedule.templateOrder.length];
      }
    }

    // Verify the template still exists
    const templateExists = await WorkoutTemplate.exists({ _id: nextTemplateId });
    if (!templateExists) {
      nextTemplateId = schedule.templateOrder[0];
    }

    return json({
      schedule: { templateOrder: schedule.templateOrder },
      nextTemplateId
    });
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

    // Validate all template IDs belong to this user
    if (templateOrder.length > 0) {
      const count = await WorkoutTemplate.countDocuments({
        _id: { $in: templateOrder },
        createdBy: user.nickname
      });
      if (count !== templateOrder.length) {
        return json({ error: 'Some template IDs are invalid' }, { status: 400 });
      }
    }

    const schedule = await WorkoutSchedule.findOneAndUpdate(
      { userId: user.nickname },
      { templateOrder },
      { upsert: true, new: true }
    );

    return json({ schedule: { templateOrder: schedule.templateOrder } });
  } catch (error) {
    console.error('Error saving workout schedule:', error);
    return json({ error: 'Failed to save workout schedule' }, { status: 500 });
  }
};
