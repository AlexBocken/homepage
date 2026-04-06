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

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const data = await request.json();
	const { date, weight, bodyFatPercent, caloricIntake, measurements, notes } = data;

	const measurement = new BodyMeasurement({
		date: date ? new Date(date) : new Date(),
		weight,
		bodyFatPercent,
		caloricIntake,
		measurements,
		notes,
		createdBy: user.nickname
	});

	await measurement.save();
	return json({ measurement }, { status: 201 });
};
