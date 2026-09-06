import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';

// Anything under /hikes or /wanderungen that no sibling route claims: a 404
// with a verse, like the other sections, instead of falling through.
export const load: PageServerLoad = ({ fetch, url }) =>
	errorWithVerse(fetch, url.pathname, 404, 'Not found');
