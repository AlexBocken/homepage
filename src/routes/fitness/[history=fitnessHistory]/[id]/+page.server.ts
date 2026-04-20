import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const res = await fetch(`/api/fitness/sessions/${params.id}`);

	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Session not found');
	}

	return {
		session: (await res.json()).session
	};
};
