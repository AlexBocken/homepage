import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodEntry } from '$models/PeriodEntry';

/** GET: List period entries (most recent first) */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const entries = await PeriodEntry.find({ createdBy: user.nickname })
		.sort({ startDate: -1 })
		.limit(limit)
		.lean();

	return json({ entries });
};

/** POST: Start a new period (or create a completed one with startDate + endDate) */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const data = await request.json();
	const { startDate, endDate } = data;

	if (!startDate) {
		return json({ error: 'startDate is required' }, { status: 400 });
	}

	const start = new Date(startDate);
	if (isNaN(start.getTime())) {
		return json({ error: 'Invalid startDate' }, { status: 400 });
	}

	// Check no ongoing period exists (endDate is null)
	if (!endDate) {
		const ongoing = await PeriodEntry.findOne({
			createdBy: user.nickname,
			endDate: null
		});
		if (ongoing) {
			return json({ error: 'An ongoing period already exists. End it first.' }, { status: 409 });
		}
	}

	const entry = await PeriodEntry.create({
		startDate: start,
		endDate: endDate ? new Date(endDate) : null,
		createdBy: user.nickname
	});

	return json({ entry }, { status: 201 });
};
