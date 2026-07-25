import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { stampDailyTargets } from '$lib/server/dailyTargets';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Copy a day's food log onto another day.
 *
 * Most days repeat. Re-logging the same breakfast by hand is the single most tedious
 * thing in the diary, and it is pure duplication of data the app already holds.
 *
 * Each entry is re-created as an independent document with the same component
 * references and frozen amounts. Editing the copy's amount scales only its own
 * components and never touches the original; both resolve their nutrition live, so a
 * later base-table fix reaches copy and original alike.
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
		components: e.components,
		loggedAs: e.loggedAs,
		...(e.liquidMl != null && { liquidMl: e.liquidMl }),
		createdBy: user.nickname,
	}));

	const created = await FoodLogEntry.insertMany(docs);

	// The target day now has food, so pin it to the current goal (see dailyTargets).
	stampDailyTargets(user.nickname, [to]).catch(() => {});

	return json({
		copied: created.length,
		// Returned so the caller can offer an exact undo rather than guessing which
		// entries were its own.
		ids: created.map((d: any) => String(d._id)),
	});
};
