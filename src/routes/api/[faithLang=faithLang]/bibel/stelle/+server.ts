import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveReference } from '$lib/server/bibleBooks';

// GET /api/glaube/bibel/stelle?ref=Gen%201,1 — a footnote cross-reference as a
// short passage, for the reader's hover peek and the phone's reference sheet.
// References use the Allioli footnote abbreviations; the text follows the
// reader: Allioli, the Douay-Rheims under /faith, the Vulgate under /fides.
export const GET: RequestHandler = async ({ url, params, setHeaders }) => {
	const ref = url.searchParams.get('ref')?.trim();
	if (!ref) return error(400, 'ref missing');
	const passage = await resolveReference(ref, params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de');
	if (!passage) return json({ missing: true, reference: ref }, { status: 404 });
	// Static text: let browsers and the CDN keep it for a day.
	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json(passage);
};
