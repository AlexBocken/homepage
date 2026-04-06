import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodShare } from '$models/PeriodShare';

/** GET: Get current share settings */
export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const doc = await PeriodShare.findOne({ owner: user.nickname }).lean();
	return json({ sharedWith: doc?.sharedWith ?? [] });
};

/** PUT: Update share list (set full list of usernames) */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const { sharedWith } = await request.json();
	if (!Array.isArray(sharedWith)) {
		return json({ error: 'sharedWith must be an array of usernames' }, { status: 400 });
	}

	// Sanitize: lowercase, trim, dedupe, remove self
	const cleaned = [...new Set(
		sharedWith.map((u: string) => u.trim().toLowerCase()).filter((u: string) => u && u !== user.nickname.toLowerCase())
	)];

	const doc = await PeriodShare.findOneAndUpdate(
		{ owner: user.nickname },
		{ sharedWith: cleaned },
		{ upsert: true, returnDocument: 'after' }
	);

	return json({ sharedWith: doc?.sharedWith ?? cleaned });
};
