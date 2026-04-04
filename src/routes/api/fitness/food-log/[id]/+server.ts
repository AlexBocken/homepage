import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const entry = await FoodLogEntry.findById(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (entry.createdBy !== user.nickname) throw error(403, 'Not authorized');

	const body = await request.json();
	const allowed = ['amountGrams', 'mealType', 'name'] as const;
	for (const key of allowed) {
		if (body[key] !== undefined) (entry as any)[key] = body[key];
	}

	await entry.save();
	return json(entry.toObject());
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const deleted = await FoodLogEntry.findOneAndDelete({
		_id: params.id,
		createdBy: user.nickname,
	});
	if (!deleted) throw error(404, 'Entry not found');
	return json({ ok: true });
};
