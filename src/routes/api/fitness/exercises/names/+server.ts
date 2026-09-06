import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { exerciseNames } from '$lib/server/exerciseCatalog';

const MAX_IDS = 200;

// GET /api/fitness/exercises/names?ids=a,b,c&lang=de — localised names for a
// batch of ids, for `<ExerciseName>`. Unknown ids are simply absent.
export const GET: RequestHandler = async ({ url, locals, setHeaders }) => {
	await requireAuth(locals);
	const lang = url.searchParams.get('lang') === 'de' ? 'de' : 'en';
	const ids = [...new Set((url.searchParams.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
	if (ids.length > MAX_IDS) return json({ error: `At most ${MAX_IDS} ids per request` }, { status: 400 });
	setHeaders({ 'Cache-Control': 'private, max-age=3600' });
	return json({ names: exerciseNames(ids, lang) });
};
