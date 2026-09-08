import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBible, searchBook } from '$lib/server/bibleBooks';

// GET /api/glaube/bibel/suche?book=joh&q=Licht — verses of one book whose
// text contains the words: Allioli's German, or the Douay-Rheims on /api/faith.
// Without `book` the whole Bible is searched and each hit names its book.
export const GET: RequestHandler = async ({ url, params, setHeaders }) => {
	const book = url.searchParams.get('book')?.trim().toLowerCase();
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) return error(400, 'q missing');
	const lang = params.faithLang === 'faith' ? 'en' : 'de';
	setHeaders({ 'Cache-Control': 'public, max-age=3600' });
	return json({ hits: book ? await searchBook(book, q, lang) : await searchBible(q, lang) });
};
