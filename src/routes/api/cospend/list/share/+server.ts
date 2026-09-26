import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createShareToken } from '$lib/server/shoppingAuth';
import { ShoppingShareToken } from '$models/ShoppingShareToken';
import { dbConnect } from '$utils/db';
import { requireAuth } from '$lib/server/middleware/auth';

// GET /api/cospend/list/share — list all active share tokens
export const GET: RequestHandler = async ({ locals }) => {
  await requireAuth(locals);

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
  const user = await requireAuth(locals);

  const { token, expiresAt } = await createShareToken(user.nickname);
  return json({ token, expiresAt: expiresAt.toISOString() });
};

// PATCH /api/cospend/list/share — update a token's expiry
export const PATCH: RequestHandler = async ({ request, locals }) => {
  await requireAuth(locals);

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
  await requireAuth(locals);

  const { id } = await request.json();
  if (!id) throw error(400, 'id required');

  await dbConnect();
  await ShoppingShareToken.findByIdAndDelete(id);

  return json({ ok: true });
};
