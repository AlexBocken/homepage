import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { IntervalTemplate } from '$models/IntervalTemplate';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const templates = await IntervalTemplate.find({ createdBy: session.user.nickname }).sort({ updatedAt: -1 });
    return json({ templates });
  } catch (error) {
    console.error('Error fetching interval templates:', error);
    return json({ error: 'Failed to fetch interval templates' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const data = await request.json();
    const { name, steps } = data;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return json({ error: 'Name and at least one step are required' }, { status: 400 });
    }

    for (const step of steps) {
      if (!step.label || !step.durationType || !step.durationValue) {
        return json({ error: 'Each step must have a label, durationType, and durationValue' }, { status: 400 });
      }
      if (!['distance', 'time'].includes(step.durationType)) {
        return json({ error: 'durationType must be "distance" or "time"' }, { status: 400 });
      }
    }

    const template = new IntervalTemplate({
      name,
      steps,
      createdBy: session.user.nickname
    });

    await template.save();
    return json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating interval template:', error);
    return json({ error: 'Failed to create interval template' }, { status: 500 });
  }
};
