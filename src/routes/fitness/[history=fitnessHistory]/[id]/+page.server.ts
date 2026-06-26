import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { runMapToken } from '$lib/server/runMapShare';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	// Unsynced (offline-queued) runs live only in the browser's IndexedDB, so
	// there's nothing to fetch server-side. The universal load (+page.ts) reads
	// them from the outbox on the client.
	if (params.id.startsWith('queued-')) {
		return { session: null, segmentEfforts: [], shareUrl: null, cardImage: null };
	}

	const res = await fetch(`/api/fitness/sessions/${params.id}`);

	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Session not found');
	}

	// Per-run share token + absolute base so the page can build a public,
	// login-free share link and OG card URL.
	const shareToken = runMapToken(params.id);

	const payload = await res.json();

	// Version the card URL by updatedAt so editing/snapping busts any cached image.
	const ver = payload.session?.updatedAt ? new Date(payload.session.updatedAt).getTime() : '';

	return {
		session: payload.session,
		segmentEfforts: payload.segmentEfforts ?? [],
		shareUrl: `${url.origin}/r/${params.id}?token=${shareToken}`,
		cardImage: `${url.origin}/api/fitness/sessions/${params.id}/card.webp?token=${shareToken}&v=${ver}`
	};
};
