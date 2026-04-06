import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { BodyMeasurement } from '$models/BodyMeasurement';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Get latest measurement that has each field (parallel)
	const base = { createdBy: user.nickname };
	const [latestWithWeight, latestWithBodyFat, latestWithMeasurements] = await Promise.all([
		BodyMeasurement.findOne({ ...base, weight: { $exists: true, $ne: null } })
			.sort({ date: -1 }).select('weight date').lean(),
		BodyMeasurement.findOne({ ...base, bodyFatPercent: { $exists: true, $ne: null } })
			.sort({ date: -1 }).select('bodyFatPercent date').lean(),
		BodyMeasurement.findOne({ ...base, measurements: { $exists: true, $ne: null } })
			.sort({ date: -1 }).select('measurements date').lean(),
	]);

	return json({
		weight: latestWithWeight
			? { value: latestWithWeight.weight, date: latestWithWeight.date }
			: null,
		bodyFatPercent: latestWithBodyFat
			? { value: latestWithBodyFat.bodyFatPercent, date: latestWithBodyFat.date }
			: null,
		measurements: latestWithMeasurements
			? {
					value: latestWithMeasurements.measurements,
					date: latestWithMeasurements.date
				}
			: null
	});
};
