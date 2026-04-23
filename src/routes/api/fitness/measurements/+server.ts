import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { BodyMeasurement } from '$models/BodyMeasurement';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	const query: Record<string, unknown> = { createdBy: user.nickname };

	if (from || to) {
		const dateFilter: Record<string, Date> = {};
		if (from) dateFilter.$gte = new Date(from);
		if (to) dateFilter.$lte = new Date(to);
		query.date = dateFilter;
	}

	const [measurements, total] = await Promise.all([
		BodyMeasurement.find(query).sort({ date: -1 }).skip(offset).limit(limit).lean(),
		BodyMeasurement.countDocuments(query)
	]);

	return json({ measurements, total, limit, offset });
};

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const data = await request.json();
	const { date, weight, bodyFatPercent, caloricIntake, measurements: bp, notes } = data;
	const overwrite = url.searchParams.get('overwrite') === '1';

	const target = date ? new Date(date) : new Date();
	const dayStart = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
	const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

	const existing = await BodyMeasurement.findOne({
		createdBy: user.nickname,
		date: { $gte: dayStart, $lt: dayEnd }
	});

	if (!existing) {
		const doc = new BodyMeasurement({
			date: dayStart,
			weight,
			bodyFatPercent,
			caloricIntake,
			measurements: bp,
			notes,
			createdBy: user.nickname
		});
		await doc.save();
		return json({ measurement: doc, merged: false }, { status: 201 });
	}

	type Conflict = { key: string; oldVal: unknown; newVal: unknown };
	const conflicts: Conflict[] = [];
	const merges: Record<string, unknown> = {};
	const existingDoc = existing;

	/** Top-level field: add if missing, conflict if present and different. Null/empty = "no value supplied". */
	function check(key: 'weight' | 'bodyFatPercent' | 'caloricIntake' | 'notes', newVal: unknown) {
		if (newVal == null || newVal === '') return;
		const oldVal = existingDoc[key];
		if (oldVal == null || oldVal === '') {
			merges[key] = newVal;
		} else if (newVal !== oldVal) {
			conflicts.push({ key, oldVal, newVal });
		}
	}

	check('weight', weight);
	check('bodyFatPercent', bodyFatPercent);
	check('caloricIntake', caloricIntake);
	check('notes', notes);

	/** Body-parts sub-object: check each field independently */
	let mergedBp: Record<string, unknown> | undefined;
	if (bp && typeof bp === 'object') {
		const existingBp = (existing.measurements ?? {}) as Record<string, unknown>;
		mergedBp = { ...existingBp };
		for (const [partKey, partVal] of Object.entries(bp)) {
			if (partVal == null) continue;
			const oldPart = existingBp[partKey];
			if (oldPart == null) {
				mergedBp[partKey] = partVal;
			} else if (oldPart !== partVal) {
				conflicts.push({ key: `measurements.${partKey}`, oldVal: oldPart, newVal: partVal });
			}
		}
	}

	if (conflicts.length > 0 && !overwrite) {
		return json({ conflicts, existingId: existing._id }, { status: 409 });
	}

	if (overwrite && conflicts.length > 0) {
		for (const c of conflicts) {
			if (c.key.startsWith('measurements.')) {
				const partKey = c.key.slice('measurements.'.length);
				if (!mergedBp) mergedBp = { ...((existing.measurements ?? {}) as Record<string, unknown>) };
				mergedBp[partKey] = c.newVal;
			} else {
				merges[c.key] = c.newVal;
			}
		}
	}

	Object.assign(existing, merges);
	if (mergedBp !== undefined) existing.measurements = mergedBp;
	await existing.save();
	return json({ measurement: existing, merged: true });
};
