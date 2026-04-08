import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ShoppingItemCategory } from '$models/ShoppingItemCategory';
import { dbConnect } from '$utils/db';

// POST /api/cospend/list/categorize/override — manually set category + icon for an item name
export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const { name, category, icon } = await request.json();
  if (!name || typeof name !== 'string') throw error(400, 'name is required');
  if (!category || typeof category !== 'string') throw error(400, 'category is required');

  const normalizedName = name.toLowerCase().trim();

  await dbConnect();
  await ShoppingItemCategory.findOneAndUpdate(
    { normalizedName },
    { normalizedName, originalName: name, category, icon: icon || null },
    { upsert: true }
  );

  return json({ ok: true });
};
