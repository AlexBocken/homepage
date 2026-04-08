import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';

const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snack', 'water'];

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const dateParam = url.searchParams.get('date');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	const query: Record<string, any> = { createdBy: user.nickname };

	if (dateParam) {
		const d = new Date(dateParam + 'T00:00:00.000Z');
		const next = new Date(d);
		next.setUTCDate(next.getUTCDate() + 1);
		query.date = { $gte: d, $lt: next };
	} else if (from || to) {
		query.date = {};
		if (from) query.date.$gte = new Date(from + 'T00:00:00.000Z');
		if (to) {
			const t = new Date(to + 'T00:00:00.000Z');
			t.setUTCDate(t.getUTCDate() + 1);
			query.date.$lt = t;
		}
	}

	const entries = await FoodLogEntry.find(query).sort({ date: -1, mealType: 1 }).lean();
	return json({ entries });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	const { date, mealType, name, source, sourceId, amountGrams, per100g } = body;

	if (!date || !name?.trim()) throw error(400, 'date and name are required');
	if (!VALID_MEALS.includes(mealType)) throw error(400, 'Invalid mealType');
	if (typeof amountGrams !== 'number' || amountGrams <= 0) throw error(400, 'amountGrams must be positive');
	if (!per100g || typeof per100g.calories !== 'number') throw error(400, 'per100g with calories is required');

	const entry = await FoodLogEntry.create({
		date: new Date(date + 'T00:00:00.000Z'),
		mealType,
		name: name.trim(),
		source: source || 'custom',
		sourceId,
		amountGrams,
		per100g,
		createdBy: user.nickname,
	});

	return json(entry.toObject(), { status: 201 });
};
