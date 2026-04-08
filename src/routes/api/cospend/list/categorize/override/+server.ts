import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ShoppingItemCategory } from '$models/ShoppingItemCategory';
import { dbConnect } from '$utils/db';
import { getShoppingUser } from '$lib/server/shoppingAuth';

// POST /api/cospend/list/categorize/override — manually set category + icon for an item name
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

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
