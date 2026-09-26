import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { WorkoutSession } from '$models/WorkoutSession';
import { templateAttempts } from '$lib/server/templateBoards';
import { activityKindOf } from '$lib/fitness/bestEffortDistances';
import { assertObjectId } from '$lib/server/ownedResource';

/**
 * GET /api/fitness/stats/workout-templates/<templateId>
 *
 * Every recorded attempt at one workout template, oldest first — the time series behind
 * the per-workout progress page. One row per session, each with its own distance, so a
 * shorter outing is visible rather than quietly compared against the rest.
 *
 * Answers from the *sessions*, not the template: a deleted or renamed template must not
 * take its history with it. 404 is therefore reserved for "you have never run this",
 * which is also what another athlete's template id looks like from here — the query is
 * scoped to the caller either way.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	const templateId = String(params.id);
	assertObjectId(templateId, 'template ID');

	await dbConnect();
	const attempts = await templateAttempts(user.nickname, templateId);
	if (attempts.length === 0) throw error(404, 'No attempts at this workout');

	// Name from the live template, falling back to the snapshot the sessions carry.
	// Activity from the sessions too — it is what was actually done.
	const [template, latest] = await Promise.all([
		WorkoutTemplate.findById(templateId).select('name activityType').lean() as any,
		WorkoutSession.findOne({ createdBy: user.nickname, templateId })
			.sort({ startTime: -1 })
			.select('templateName activityType')
			.lean() as any,
	]);

	return json({
		templateId,
		name: template?.name || latest?.templateName || '',
		exists: !!template,
		activity: activityKindOf(latest?.activityType ?? template?.activityType),
		attempts,
	});
};
