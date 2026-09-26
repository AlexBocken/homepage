import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { coercePortion, coercePortions } from '$lib/fitness/portions';
import { resolveEntries } from '$lib/server/foodLogComponents';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const entry = await FoodLogEntry.findById(params.id);
	if (!entry) throw error(404, 'Entry not found');
	if (entry.createdBy !== user.nickname) throw error(403, 'Not authorized');

	const body = await request.json();
	if (body.name !== undefined) entry.name = body.name;
	if (body.mealType !== undefined) entry.mealType = body.mealType;

	if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
		entry.date = new Date(body.date + 'T00:00:00.000Z');
	}

	// The diary amount is the sum of the component amounts, so changing it scales
	// every component by the same factor — the composition (their ratios) is frozen,
	// only the overall size moves.
	if (typeof body.amountGrams === 'number' && body.amountGrams > 0) {
		const current = entry.components.reduce((s, c) => s + (c.amountGrams ?? 0), 0);
		if (current > 0) {
			const factor = body.amountGrams / current;
			for (const c of entry.components) c.amountGrams *= factor;
		}
	}

	// Portion display is per-leaf. It only makes sense to edit for a plain food (one
	// component); a decomposed meal has no single portion basis. `null` means the
	// user switched back to plain grams, distinct from omitting the key.
	if (entry.components.length === 1) {
		if (body.selectedPortion !== undefined) {
			entry.components[0].selectedPortion = coercePortion(body.selectedPortion) ?? undefined;
		}
		if (body.portions !== undefined) {
			entry.components[0].portions = coercePortions(body.portions);
		}
	}

	await entry.save();
	const [hydrated] = await resolveEntries([entry.toObject() as any]);
	return json(hydrated);
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
