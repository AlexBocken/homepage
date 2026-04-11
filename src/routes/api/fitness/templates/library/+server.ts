import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { defaultTemplates } from '$lib/data/defaultTemplates';

// GET /api/fitness/templates/library — list available library templates
// Returns each template with an `added` flag if user already has it
export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Find which library templates the user already saved (by libraryId)
	const existing = await WorkoutTemplate.find(
		{ createdBy: user.nickname, libraryId: { $exists: true, $ne: null } },
		{ libraryId: 1 }
	).lean();
	const addedIds = new Set(existing.map((t: any) => t.libraryId));

	const library = defaultTemplates.map((t) => ({
		...t,
		added: addedIds.has(t.id),
	}));

	return json({ templates: library });
};

// POST /api/fitness/templates/library — add a library template to user's collection
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const { id } = await request.json();
	const libTemplate = defaultTemplates.find((t) => t.id === id);
	if (!libTemplate) {
		return json({ error: 'Template not found in library' }, { status: 404 });
	}

	// Prevent duplicates
	const exists = await WorkoutTemplate.exists({
		createdBy: user.nickname,
		libraryId: id
	});
	if (exists) {
		return json({ error: 'Template already added' }, { status: 409 });
	}

	const template = await WorkoutTemplate.create({
		name: libTemplate.name,
		description: libTemplate.description,
		exercises: libTemplate.exercises,
		libraryId: libTemplate.id,
		createdBy: user.nickname,
	});

	return json({ template }, { status: 201 });
};
