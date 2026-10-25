import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { parseSubmission, recordSession } from '$lib/server/caseMath';

/**
 * Submit a finished case-math session (also sent as a beacon when the tab is
 * closed mid-drill). Returns the server's grading and any level changes.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireFinanceOwner(locals);
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	const result = await recordSession(user.nickname, parseSubmission(body));
	return json(result, { status: 201 });
};
