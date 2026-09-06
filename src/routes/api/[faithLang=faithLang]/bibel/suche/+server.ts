import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBook } from '$lib/server/bibleBooks';

// GET /api/glaube/bibel/suche?book=joh&q=Licht — verses of one imported book
// whose German text contains the words.
export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const book = url.searchParams.get('book')?.trim().toLowerCase();
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!book) return error(400, 'book missing');
	setHeaders({ 'Cache-Control': 'public, max-age=3600' });
	return json({ hits: await searchBook(book, q) });
};
