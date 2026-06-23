import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FitnessDashboard, DASHBOARD_KEYS } from '$models/FitnessDashboard';

const defaults = () => Object.fromEntries(DASHBOARD_KEYS.map((k) => [k, true]));

export const GET: RequestHandler = async ({ locals }) => {
  const user = await requireAuth(locals);
  await dbConnect();
  const doc = (await FitnessDashboard.findOne({ username: user.nickname }).lean()) as Record<string, unknown> | null;
  const out = defaults();
  if (doc) for (const k of DASHBOARD_KEYS) if (typeof doc[k] === 'boolean') out[k] = doc[k] as boolean;
  return json(out);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);
  const body = await request.json();
  const update: Record<string, boolean> = {};
  for (const k of DASHBOARD_KEYS) if (typeof body[k] === 'boolean') update[k] = body[k];
  await dbConnect();
  await FitnessDashboard.updateOne({ username: user.nickname }, { $set: update }, { upsert: true });
  return json({ ok: true });
};
