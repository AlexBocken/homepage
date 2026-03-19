import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { BodyMeasurement } from '$models/BodyMeasurement';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Get latest measurement that has each field
	const latestWithWeight = await BodyMeasurement.findOne({
		createdBy: user.nickname,
		weight: { $exists: true, $ne: null }
	})
		.sort({ date: -1 })
		.select('weight date')
		.lean();

	const latestWithBodyFat = await BodyMeasurement.findOne({
		createdBy: user.nickname,
		bodyFatPercent: { $exists: true, $ne: null }
	})
		.sort({ date: -1 })
		.select('bodyFatPercent date')
		.lean();

	const latestWithCalories = await BodyMeasurement.findOne({
		createdBy: user.nickname,
		caloricIntake: { $exists: true, $ne: null }
	})
		.sort({ date: -1 })
		.select('caloricIntake date')
		.lean();

	const latestWithMeasurements = await BodyMeasurement.findOne({
		createdBy: user.nickname,
		measurements: { $exists: true, $ne: null }
	})
		.sort({ date: -1 })
		.select('measurements date')
		.lean();

	return json({
		weight: latestWithWeight
			? { value: latestWithWeight.weight, date: latestWithWeight.date }
			: null,
		bodyFatPercent: latestWithBodyFat
			? { value: latestWithBodyFat.bodyFatPercent, date: latestWithBodyFat.date }
			: null,
		caloricIntake: latestWithCalories
			? { value: latestWithCalories.caloricIntake, date: latestWithCalories.date }
			: null,
		measurements: latestWithMeasurements
			? {
					value: latestWithMeasurements.measurements,
					date: latestWithMeasurements.date
				}
			: null
	});
};
