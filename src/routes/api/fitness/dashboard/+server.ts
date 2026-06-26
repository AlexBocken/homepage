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
  const out: Record<string, unknown> = defaults();
  out.segmentStatIds = [];
  out.fastestKm = 5;
  out.fastestActivity = 'running';
  if (doc) {
    for (const k of DASHBOARD_KEYS) if (typeof doc[k] === 'boolean') out[k] = doc[k] as boolean;
    if (Array.isArray(doc.segmentStatIds)) out.segmentStatIds = doc.segmentStatIds;
    else if (typeof doc.segmentStatId === 'string' && doc.segmentStatId) out.segmentStatIds = [doc.segmentStatId];
    if (typeof doc.fastestKm === 'number') out.fastestKm = doc.fastestKm;
    if (doc.fastestActivity === 'cycling' || doc.fastestActivity === 'running') out.fastestActivity = doc.fastestActivity;
  }
  return json(out);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  const user = await requireAuth(locals);
  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const k of DASHBOARD_KEYS) if (typeof body[k] === 'boolean') update[k] = body[k];
  // Up to two tracked segment ids (free-form strings, not toggles).
  if (Array.isArray(body.segmentStatIds)) {
    update.segmentStatIds = body.segmentStatIds
      .filter((s: unknown) => typeof s === 'string')
      .slice(0, 2)
      .map((s: string) => s.slice(0, 64));
  }
  if (typeof body.fastestKm === 'number' && Number.isFinite(body.fastestKm)) {
    update.fastestKm = Math.min(200, Math.max(1, Math.round(body.fastestKm)));
  }
  if (body.fastestActivity === 'running' || body.fastestActivity === 'cycling') {
    update.fastestActivity = body.fastestActivity;
  }
  await dbConnect();
  await FitnessDashboard.updateOne({ username: user.nickname }, { $set: update }, { upsert: true });
  return json({ ok: true });
};
