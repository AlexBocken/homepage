import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allAuthors } from '$lib/server/commentary';

// GET /api/glaube/bibel/kommentar/autoren — every commentator in the
// collection with how much he wrote, for the reader's picker.
export const GET: RequestHandler = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({ authors: await allAuthors() });
};
