import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBook } from '$lib/server/bibleBooks';

// GET /api/glaube/bibel/suche?book=joh&q=Licht — verses of one book whose
// text contains the words: Allioli's German, or the Douay-Rheims on /api/faith.
export const GET: RequestHandler = async ({ url, params, setHeaders }) => {
	const book = url.searchParams.get('book')?.trim().toLowerCase();
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!book) return error(400, 'book missing');
	setHeaders({ 'Cache-Control': 'public, max-age=3600' });
	return json({ hits: await searchBook(book, q, params.faithLang === 'faith' ? 'en' : 'de') });
};
