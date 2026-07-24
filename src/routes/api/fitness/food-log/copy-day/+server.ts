import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Copy a day's food log onto another day.
 *
 * Most days repeat. Re-logging the same breakfast by hand is the single most tedious
 * thing in the diary, and it is pure duplication of data the app already holds.
 *
 * The copy is a snapshot, not a link: each entry is re-created with the per100g it
 * had on the source day. Editing the copy must never reach back and change the
 * original, and the original's nutrition figures are the ones that were true when it
 * was logged.
 *
 * Appends rather than replaces. Overwriting a day someone has already part-filled is
 * destructive and not obviously undoable, so anything already logged on the target
 * day stays, and the response says how many entries were added for the caller to
 * report honestly.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	const from = String(body?.from ?? '');
	const to = String(body?.to ?? '');

	if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw error(400, 'from and to must be YYYY-MM-DD');
	if (from === to) throw error(400, 'from and to must differ');

	const fromStart = new Date(from + 'T00:00:00.000Z');
	const fromEnd = new Date(from + 'T23:59:59.999Z');

	const source = await FoodLogEntry.find({
		createdBy: user.nickname,
		date: { $gte: fromStart, $lte: fromEnd },
	}).lean() as any[];

	if (source.length === 0) {
		return json({ copied: 0, ids: [] });
	}

	// Water is a running total for the day rather than a logged item, so copying it
	// would double-count a target day that already has some.
	const copyable = source.filter(e => e.mealType !== 'water');
	if (copyable.length === 0) return json({ copied: 0, ids: [] });

	const targetDate = new Date(to + 'T00:00:00.000Z');
	const docs = copyable.map(e => ({
		date: targetDate,
		mealType: e.mealType,
		name: e.name,
		source: e.source,
		sourceId: e.sourceId,
		amountGrams: e.amountGrams,
		portions: e.portions,
		selectedPortion: e.selectedPortion,
		per100g: e.per100g,
		liquidMl: e.liquidMl,
		createdBy: user.nickname,
	}));

	const created = await FoodLogEntry.insertMany(docs);
	return json({
		copied: created.length,
		// Returned so the caller can offer an exact undo rather than guessing which
		// entries were its own.
		ids: created.map((d: any) => String(d._id)),
	});
};
