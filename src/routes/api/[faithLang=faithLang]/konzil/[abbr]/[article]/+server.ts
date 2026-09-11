import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { articles } from '$lib/server/council';
import { addressed } from '$lib/faith/councilText';
import { councilPath, isCouncilAbbr, parseRange } from '$lib/faith/councilTypes';
import { langFromFaithSlug } from '$lib/js/faithI18n';

// GET /api/glaube/konzil/lg/11 — one article of a council document, or a short
// run of them, for the hover peek behind an "LG 11" citation. The notes are
// left out, as they are in a Catechism peek.
const MOST = 4;

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	if (!isCouncilAbbr(params.abbr)) return error(400, 'no such document');
	const range = parseRange(params.article, 999);
	if (!range) return error(400, 'not an article number');
	const lang = langFromFaithSlug(params.faithLang);

	const found = await articles(lang, params.abbr, range.from, Math.min(range.to, range.from + MOST - 1));
	if (!found) return json({ missing: true, reference: params.article }, { status: 404 });

	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({
		label: `${params.abbr.toUpperCase()} ${range.from}${range.to !== range.from ? `-${range.to}` : ''}`,
		where: found.document.title,
		goto: `${councilPath(lang, params.abbr)}#a${range.from}`,
		paragraphs: found.articles.map((a) => ({ n: a.n, html: addressed(a.html) })),
		more: range.to > range.from + MOST - 1
	});
};
