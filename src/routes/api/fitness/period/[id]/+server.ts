import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodEntry } from '$models/PeriodEntry';
import { canEditPeriodCalendar } from '$lib/server/periodAccess';
import mongoose from 'mongoose';

/** PUT: Update a period entry (e.g. set endDate to end an ongoing period) */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid period ID' }, { status: 400 });
	}

	const existing = await PeriodEntry.findById(params.id);
	if (!existing) {
		return json({ error: 'Period entry not found' }, { status: 404 });
	}
	if (!(await canEditPeriodCalendar(user.nickname, existing.createdBy))) {
		return json({ error: 'Not allowed to edit this calendar' }, { status: 403 });
	}

	const data = await request.json();
	if (data.startDate !== undefined) existing.startDate = new Date(data.startDate);
	if (data.endDate !== undefined) existing.endDate = data.endDate ? new Date(data.endDate) : null;
	await existing.save();

	return json({ entry: existing });
};

/** DELETE: Remove a period entry */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid period ID' }, { status: 400 });
	}

	const entry = await PeriodEntry.findById(params.id);
	if (!entry) {
		return json({ error: 'Period entry not found' }, { status: 404 });
	}
	if (!(await canEditPeriodCalendar(user.nickname, entry.createdBy))) {
		return json({ error: 'Not allowed to edit this calendar' }, { status: 403 });
	}

	await entry.deleteOne();
	return json({ message: 'Period entry deleted' });
};
