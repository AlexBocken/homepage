import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = ({ fetch, url }) =>
	errorWithVerse(fetch, url.pathname, 404, 'Not found');
