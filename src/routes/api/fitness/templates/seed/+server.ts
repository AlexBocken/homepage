import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { defaultTemplates } from '$lib/data/defaultTemplates';

export const POST: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Check if user already has templates (don't re-seed)
	const existingCount = await WorkoutTemplate.countDocuments({ createdBy: user.nickname });
	if (existingCount > 0) {
		return json({ message: 'Templates already exist', seeded: false });
	}

	const templates = await WorkoutTemplate.insertMany(
		defaultTemplates.map((t) => ({
			...t,
			createdBy: user.nickname,
			isDefault: true
		}))
	);

	return json({ message: 'Default templates created', templates, seeded: true }, { status: 201 });
};
