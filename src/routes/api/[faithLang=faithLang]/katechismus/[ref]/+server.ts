import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { paragraphs, sectionTitle } from '$lib/server/ccc';
import { addressed, cccPath } from '$lib/faith/cccText';
import { cccLabel, parseCccRange } from '$lib/faith/cccTypes';
import { langFromFaithSlug } from '$lib/js/faithI18n';

// GET /api/glaube/katechismus/2095 — a paragraph or a short range, for the
// hover peek behind a `KKK 2095` citation. The notes are left out; the
// Scripture citations inside the text keep their links, so a peek opened from
// a peek still works.
const MOST = 8;

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const range = parseCccRange(params.ref);
	if (!range) return error(400, 'not a paragraph number');
	const lang = langFromFaithSlug(params.faithLang);

	const found = await paragraphs(lang, range.from, Math.min(range.to, range.from + MOST - 1));
	if (!found || found.paragraphs.length === 0) return json({ missing: true, reference: params.ref }, { status: 404 });

	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({
		label: cccLabel(lang, range.from, range.to),
		where: sectionTitle(lang, found.section),
		goto: cccPath(lang, params.ref),
		paragraphs: found.paragraphs.map((p) => ({ n: p.n, html: addressed(lang, p.html) })),
		more: range.to > range.from + MOST - 1 || found.more
	});
};
