import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createShareToken } from '$lib/server/shoppingAuth';
import { ShoppingShareToken } from '$models/ShoppingShareToken';
import { dbConnect } from '$utils/db';

// GET /api/cospend/list/share — list all active share tokens
export const GET: RequestHandler = async ({ locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  await dbConnect();
  const tokens = await ShoppingShareToken.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .lean();

  return json(tokens.map(t => ({
    id: t._id.toString(),
    token: t.token,
    expiresAt: t.expiresAt,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
  })));
};

// POST /api/cospend/list/share — create a new share token
export const POST: RequestHandler = async ({ locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const { token, expiresAt } = await createShareToken(auth.user.nickname);
  return json({ token, expiresAt: expiresAt.toISOString() });
};

// PATCH /api/cospend/list/share — update a token's expiry
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const { id, expiresAt } = await request.json();
  if (!id || !expiresAt) throw error(400, 'id and expiresAt required');

  await dbConnect();
  const doc = await ShoppingShareToken.findByIdAndUpdate(
    id,
    { expiresAt: new Date(expiresAt) },
    { returnDocument: 'after', lean: true }
  );
  if (!doc) throw error(404, 'Token not found');

  return json({ ok: true });
};

// DELETE /api/cospend/list/share — revoke a token
export const DELETE: RequestHandler = async ({ request, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth?.user?.nickname) throw error(401, 'Not logged in');

  const { id } = await request.json();
  if (!id) throw error(400, 'id required');

  await dbConnect();
  await ShoppingShareToken.findByIdAndDelete(id);

  return json({ ok: true });
};
