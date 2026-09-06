import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { catalogQueryFromParams } from '$lib/fitness/exerciseCatalog';
import { searchCatalog } from '$lib/server/exerciseCatalog';

// GET /api/fitness/exercises/catalog — search the static ExerciseDB catalogue.
// Params: q, type (all|non-stretch|cardio|stretch), eq[], muscle[], bodyPart[],
// target, lang. Returns the slim per-row summary; the full record is at
// /api/fitness/exercises/[id].
export const GET: RequestHandler = async ({ url, locals, setHeaders }) => {
	await requireAuth(locals);
	const lang = url.searchParams.get('lang') === 'de' ? 'de' : 'en';
	const exercises = searchCatalog(catalogQueryFromParams(url.searchParams), lang);
	// Static data, identical for every user: let the browser keep a query for a
	// while, but never a shared cache (the response is auth-gated).
	setHeaders({ 'Cache-Control': 'private, max-age=300' });
	return json({ exercises });
};
