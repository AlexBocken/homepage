import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { BodyMeasurement } from '$models/BodyMeasurement';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid measurement ID' }, { status: 400 });
	}

	const measurement = await BodyMeasurement.findOne({
		_id: params.id,
		createdBy: user.nickname
	});

	if (!measurement) {
		return json({ error: 'Measurement not found' }, { status: 404 });
	}

	return json({ measurement });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid measurement ID' }, { status: 400 });
	}

	const data = await request.json();
	const { date, weight, bodyFatPercent, caloricIntake, measurements, notes } = data;

	const updateData: Record<string, unknown> = {};
	if (date) updateData.date = new Date(date);
	if (weight !== undefined) updateData.weight = weight;
	if (bodyFatPercent !== undefined) updateData.bodyFatPercent = bodyFatPercent;
	if (caloricIntake !== undefined) updateData.caloricIntake = caloricIntake;
	if (measurements !== undefined) updateData.measurements = measurements;
	if (notes !== undefined) updateData.notes = notes;

	const measurement = await BodyMeasurement.findOneAndUpdate(
		{ _id: params.id, createdBy: user.nickname },
		updateData,
		{ returnDocument: 'after' }
	);

	if (!measurement) {
		return json({ error: 'Measurement not found or unauthorized' }, { status: 404 });
	}

	return json({ measurement });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		return json({ error: 'Invalid measurement ID' }, { status: 400 });
	}

	const measurement = await BodyMeasurement.findOneAndDelete({
		_id: params.id,
		createdBy: user.nickname
	});

	if (!measurement) {
		return json({ error: 'Measurement not found or unauthorized' }, { status: 404 });
	}

	return json({ message: 'Measurement deleted successfully' });
};
