import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { IntervalTemplate, validateIntervalEntries } from '$models/IntervalTemplate';
import { requireAuth } from '$lib/server/middleware/auth';
import { assertObjectId } from '$lib/server/ownedResource';

export const GET: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const template = await IntervalTemplate.findOne({
      _id: params.id,
      createdBy: user.nickname
    });

    if (!template) {
      return json({ error: 'Template not found' }, { status: 404 });
    }

    return json({ template });
  } catch (error) {
    console.error('Error fetching interval template:', error);
    return json({ error: 'Failed to fetch interval template' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const data = await request.json();
    const { name, steps } = data;

    if (!name || !steps) {
      return json({ error: 'Name and at least one step are required' }, { status: 400 });
    }

    const validationError = validateIntervalEntries(steps);
    if (validationError) return json({ error: validationError }, { status: 400 });

    const template = await IntervalTemplate.findOneAndUpdate(
      { _id: params.id, createdBy: user.nickname },
      { name, steps },
      { returnDocument: 'after' }
    );

    if (!template) {
      return json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return json({ template });
  } catch (error) {
    console.error('Error updating interval template:', error);
    return json({ error: 'Failed to update interval template' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = await requireAuth(locals);

  assertObjectId(params.id, 'template ID');

  try {
    await dbConnect();

    const template = await IntervalTemplate.findOneAndDelete({
      _id: params.id,
      createdBy: user.nickname
    });

    if (!template) {
      return json({ error: 'Template not found or unauthorized' }, { status: 404 });
    }

    return json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting interval template:', error);
    return json({ error: 'Failed to delete interval template' }, { status: 500 });
  }
};
