import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeItem } from '$lib/server/shoppingCategorizer';

// POST /api/cospend/list/categorize — categorize a shopping item by name
export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    throw error(400, 'name is required');
  }

  const result = await categorizeItem(name);
  return json(result);
};
