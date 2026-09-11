import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canons } from '$lib/server/council';
import { LAST_CANON, canonPath, parseRange } from '$lib/faith/councilTypes';
import { langFromFaithSlug, m } from '$lib/js/faithI18n';

// GET /api/glaube/kirchenrecht/1055 — a canon, or a short run of them, for the
// hover peek behind a "CIC, can. 1055" citation.
const MOST = 4;

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const range = parseRange(params.ref, LAST_CANON);
	if (!range) return error(400, 'not a canon number');
	const lang = langFromFaithSlug(params.faithLang);

	const found = await canons(lang, range.from, Math.min(range.to, range.from + MOST - 1));
	if (!found.length) return json({ missing: true, reference: params.ref }, { status: 404 });

	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({
		label: `${m[lang].canon_canon} ${range.from}${range.to !== range.from ? `-${range.to}` : ''}`,
		where: found[0].where[found[0].where.length - 1] ?? '',
		goto: `${canonPath(lang, range.from)}#c${range.from}`,
		paragraphs: found.map((c) => ({ n: c.n, html: c.html })),
		more: range.to > range.from + MOST - 1
	});
};
