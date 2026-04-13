import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { IntervalTemplate, validateIntervalEntries } from '$models/IntervalTemplate';

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

    if (!name || !steps) {
      return json({ error: 'Name and at least one step are required' }, { status: 400 });
    }

    const validationError = validateIntervalEntries(steps);
    if (validationError) return json({ error: validationError }, { status: 400 });

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
