import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { DismissedSuggestion } from '$models/DismissedSuggestion';
import { requireAuth } from '$lib/server/middleware/auth';

// POST /api/fitness/segments/suggestions/dismiss — permanently hide a suggested
// corridor (by its route hash) for the caller.
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);

  try {
    const { routeHash } = await request.json();
    if (!routeHash || typeof routeHash !== 'string') {
      return json({ error: 'routeHash required' }, { status: 400 });
    }
    await dbConnect();
    await DismissedSuggestion.updateOne(
      { userId: user.nickname, routeHash },
      { $setOnInsert: { userId: user.nickname, routeHash } },
      { upsert: true }
    );
    return json({ ok: true });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    return json({ error: 'Failed to dismiss' }, { status: 500 });
  }
};
