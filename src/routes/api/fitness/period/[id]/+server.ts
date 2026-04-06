import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodEntry } from '$models/PeriodEntry';
import mongoose from 'mongoose';

/** PUT: Update a period entry (e.g. set endDate to end an ongoing period) */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid period ID' }, { status: 400 });
	}

	const data = await request.json();
	const updateData: Record<string, unknown> = {};

	if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
	if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

	const entry = await PeriodEntry.findOneAndUpdate(
		{ _id: params.id, createdBy: user.nickname },
		updateData,
		{ returnDocument: 'after' }
	);

	if (!entry) {
		return json({ error: 'Period entry not found or unauthorized' }, { status: 404 });
	}

	return json({ entry });
};

/** DELETE: Remove a period entry */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid period ID' }, { status: 400 });
	}

	const entry = await PeriodEntry.findOneAndDelete({
		_id: params.id,
		createdBy: user.nickname
	});

	if (!entry) {
		return json({ error: 'Period entry not found or unauthorized' }, { status: 404 });
	}

	return json({ message: 'Period entry deleted' });
};
