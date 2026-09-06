import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { catalogFilters } from '$lib/server/exerciseCatalog';

// GET /api/fitness/exercises/catalog/filters — body parts, equipment and
// targets present in the static catalogue (the Mongo-backed
// /api/fitness/exercises/filters describes a different, user-facing set).
export const GET: RequestHandler = async ({ locals, setHeaders }) => {
	await requireAuth(locals);
	setHeaders({ 'Cache-Control': 'private, max-age=3600' });
	return json(catalogFilters());
};
