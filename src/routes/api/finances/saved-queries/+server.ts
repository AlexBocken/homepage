import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FinanceQuery } from '$models/FinanceQuery';

// Named favourite BQL queries for the query console. This specific route takes
// precedence over the /api/finances/[...path] sidecar proxy. Owner-gated by
// hooks.server.ts (nickname === 'alexander'); requireAuth is defence-in-depth.

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();
	const rows = await FinanceQuery.find({ createdBy: user.nickname })
		.sort({ name: 1 })
		.lean();
	return json(
		rows.map((r) => ({ id: String(r._id), name: r.name, query: r.query }))
	);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const { name, query } = await request.json();
	if (typeof name !== 'string' || !name.trim() || typeof query !== 'string' || !query.trim()) {
		throw error(400, 'name and query are required');
	}
	await dbConnect();
	// Upsert by (owner, name) so re-saving a name overwrites it.
	const doc = await FinanceQuery.findOneAndUpdate(
		{ createdBy: user.nickname, name: name.trim() },
		{ query },
		{ new: true, upsert: true }
	).lean();
	return json({ id: String(doc._id), name: doc.name, query: doc.query });
};
