import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search, sectionTitle } from '$lib/server/ccc';
import { langFromFaithSlug } from '$lib/js/faithI18n';

// GET /api/glaube/katechismus/suche?q=Gewissen — paragraphs whose text contains
// the words, in the language of the faith slug it is called under. Each hit
// names the section it belongs to, so the list can be grouped.
export const GET: RequestHandler = async ({ url, params, setHeaders }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) return error(400, 'q missing');
	const lang = langFromFaithSlug(params.faithLang);
	setHeaders({ 'Cache-Control': 'public, max-age=3600' });
	const hits = await search(lang, q);
	return json({ hits: hits.map((hit) => ({ ...hit, title: sectionTitle(lang, hit.section) })) });
};
