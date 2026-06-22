import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { runMapToken } from '$lib/server/runMapShare';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const res = await fetch(`/api/fitness/sessions/${params.id}`);

	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Session not found');
	}

	// Per-run share token + absolute base so the page can build a public,
	// login-free share link and OG card URL.
	const shareToken = runMapToken(params.id);

	return {
		session: (await res.json()).session,
		shareUrl: `${url.origin}/r/${params.id}?token=${shareToken}`,
		cardImage: `${url.origin}/api/fitness/sessions/${params.id}/card.webp?token=${shareToken}`
	};
};
