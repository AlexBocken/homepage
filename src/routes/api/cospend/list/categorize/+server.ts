import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeItem } from '$lib/server/shoppingCategorizer';
import { getShoppingUser } from '$lib/server/shoppingAuth';

// POST /api/cospend/list/categorize — categorize a shopping item by name
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    throw error(400, 'name is required');
  }

  const result = await categorizeItem(name);
  return json(result);
};
