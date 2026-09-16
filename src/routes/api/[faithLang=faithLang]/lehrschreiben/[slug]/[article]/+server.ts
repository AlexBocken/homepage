import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { articles } from '$lib/server/magisterium';
import { addressed } from '$lib/faith/councilText';
import { entryOf } from '$lib/faith/magisterium';
import { magisteriumPath } from '$lib/faith/magisteriumTypes';
import { parseRange } from '$lib/faith/councilTypes';
import { langFromFaithSlug } from '$lib/js/faithI18n';

// GET /api/glaube/lehrschreiben/centesimus-annus/24 — one article of a papal
// document, or a short run, for the hover peek behind the citation. The notes
// are left out, as they are in a Catechism peek.
const MOST = 4;

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const entry = entryOf(params.slug);
	if (!entry) return error(400, 'no such document');
	const range = parseRange(params.article, entry.articles);
	if (!range) return error(400, 'not an article number');
	const lang = langFromFaithSlug(params.faithLang);

	const found = await articles(lang, params.slug, range.from, Math.min(range.to, range.from + MOST - 1));
	if (!found) return json({ missing: true, reference: params.article }, { status: 404 });

	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({
		label: `${entry.title} ${range.from}${range.to !== range.from ? `-${range.to}` : ''}`,
		where: found.document.subtitle || entry.title,
		goto: `${magisteriumPath(lang, params.slug)}#a${range.from}`,
		paragraphs: found.articles.map((a) => ({ n: a.n, html: addressed(a.html) })),
		more: range.to > range.from + MOST - 1
	});
};
