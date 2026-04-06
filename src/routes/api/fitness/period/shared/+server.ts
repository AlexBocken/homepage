import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodShare } from '$models/PeriodShare';
import { PeriodEntry } from '$models/PeriodEntry';

/** GET: Get period data from all users who have shared with the current user */
export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Find all share docs where current user is in the sharedWith list
	const shares = await PeriodShare.find({ sharedWith: user.nickname }).lean();
	const owners = shares.map(s => s.owner);

	if (owners.length === 0) return json({ shared: [] });

	// Fetch period entries for all sharing owners
	const entries = await PeriodEntry.find({ createdBy: { $in: owners } })
		.sort({ startDate: -1 })
		.limit(200)
		.lean();

	// Group by owner
	const byOwner = new Map<string, any[]>();
	for (const e of entries) {
		const list = byOwner.get(e.createdBy) ?? [];
		list.push(e);
		byOwner.set(e.createdBy, list);
	}

	const shared = owners
		.filter(o => byOwner.has(o))
		.map(owner => ({ owner, entries: byOwner.get(owner)! }));

	return json({ shared });
};
