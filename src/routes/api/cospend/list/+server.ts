import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { ShoppingList, type IShoppingList } from '$models/ShoppingList';
import { broadcast } from '$lib/server/shoppingSSE';
import { getShoppingUser } from '$lib/server/shoppingAuth';

type ShoppingListDoc = IShoppingList & { version: number };

async function getOrCreateList(): Promise<ShoppingListDoc> {
  const existing = await ShoppingList.findOne().lean<ShoppingListDoc>();
  if (existing) return existing;
  const created = await ShoppingList.create({ version: 0, items: [] });
  return created.toObject() as ShoppingListDoc;
}

// GET /api/cospend/list — fetch current shopping list
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

  await dbConnect();
  const list = await getOrCreateList();
  return json(list);
};

// PUT /api/cospend/list — update shopping list with version conflict detection
export const PUT: RequestHandler = async ({ request, locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

  await dbConnect();
  const data = await request.json();
  const { items, expectedVersion } = data;

  if (!Array.isArray(items)) {
    throw error(400, 'items must be an array');
  }

  const existing = await getOrCreateList();

  if (expectedVersion != null && existing.version !== expectedVersion) {
    return json(
      { error: 'Version conflict', list: existing },
      { status: 409 }
    );
  }

  const newVersion = existing.version + 1;

  const doc = await ShoppingList.findOneAndUpdate(
    {},
    { $set: { items, version: newVersion } },
    { upsert: true, returnDocument: 'after', lean: true }
  );

  broadcast('update', doc);

  return json(doc);
};

// DELETE /api/cospend/list — clear all items
export const DELETE: RequestHandler = async ({ locals, url }) => {
  const user = await getShoppingUser(locals, url);
  if (!user) throw error(401, 'Not logged in');

  await dbConnect();
  const existing = await getOrCreateList();
  const newVersion = existing.version + 1;

  const doc = await ShoppingList.findOneAndUpdate(
    {},
    { $set: { items: [], version: newVersion } },
    { upsert: true, returnDocument: 'after', lean: true }
  );

  broadcast('update', doc);

  return json({ ok: true });
};
