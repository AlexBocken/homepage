import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { migrateFoodLogToReferences } from '$lib/server/foodLogMigration';

/**
 * One-time migration of the food log from snapshot form to reference (component)
 * form. Admin-gated (rezepte_users), dry-run by default.
 *
 *   POST .../administration/convert-food-log            → dry run, reports the plan
 *   POST .../administration/convert-food-log?apply=true → writes
 *
 * Idempotent and orphan-safe (see $lib/server/foodLogMigration), so re-running after
 * an apply is harmless.
 */
export const POST: RequestHandler = async ({ locals, url }) => {
	const session = locals.session ?? await locals.auth();
	if (!session?.user?.nickname) throw error(401, 'Not authenticated');
	if (!session.user.groups?.includes('rezepte_users')) throw error(403, 'Not authorized');

	await dbConnect();
	const apply = url.searchParams.get('apply') === 'true';
	const report = await migrateFoodLogToReferences(apply);
	return json(report);
};
