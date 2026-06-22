import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { DismissedSuggestion } from '$models/DismissedSuggestion';

// POST /api/fitness/segments/suggestions/dismiss — permanently hide a suggested
// corridor (by its route hash) for the caller.
export const POST: RequestHandler = async ({ request, locals }) => {
  const session = locals.session ?? (await locals.auth());
  if (!session || !session.user?.nickname) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { routeHash } = await request.json();
    if (!routeHash || typeof routeHash !== 'string') {
      return json({ error: 'routeHash required' }, { status: 400 });
    }
    await dbConnect();
    await DismissedSuggestion.updateOne(
      { userId: session.user.nickname, routeHash },
      { $setOnInsert: { userId: session.user.nickname, routeHash } },
      { upsert: true }
    );
    return json({ ok: true });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    return json({ error: 'Failed to dismiss' }, { status: 500 });
  }
};
