import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { runMapToken } from '$lib/server/runMapShare';
import { detectFitnessLang } from '$lib/js/fitnessI18n';
import { extractId, isQueuedId, sessionParam } from '$lib/fitness/prettyUrl';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	// The route param is `<slug>-<id>`, but only the trailing id is real — see
	// $lib/fitness/prettyUrl. Everything below keys off the extracted id: the API
	// lookup, the share token, and the share/card URLs.
	const id = extractId(params.id);

	// Unsynced (offline-queued) runs live only in the browser's IndexedDB, so
	// there's nothing to fetch server-side. The universal load (+page.ts) reads
	// them from the outbox on the client.
	if (isQueuedId(id)) {
		return { session: null, segmentEfforts: [], shareUrl: null, cardImage: null };
	}

	const res = await fetch(`/api/fitness/sessions/${id}`);

	if (!res.ok) {
		await errorWithVerse(fetch, url.pathname, 404, 'Session not found');
	}

	const payload = await res.json();

	// Heal the URL: a bare id, a slug left stale by a rename, or a mangled one all
	// resolve above and then redirect to the canonical spelling. Deliberately after
	// the fetch, so an unknown id 404s instead of redirecting to a prettier 404.
	// The query string is preserved — ?highlight=seg:… drives the map, and the
	// callers that only hold an id (stats, best-effort links) arrive with it set.
	const lang = detectFitnessLang(url.pathname);
	const canonical = sessionParam(payload.session, lang);
	if (canonical !== params.id) {
		const target = resolve('/fitness/[history=fitnessHistory]/[id]', {
			history: params.history,
			id: canonical
		});
		redirect(308, `${target}${url.search}`);
	}

	// Per-run share token + absolute base so the page can build a public,
	// login-free share link and OG card URL.
	const shareToken = runMapToken(id);

	// Version the card URL by updatedAt so editing/snapping busts any cached image.
	const ver = payload.session?.updatedAt ? new Date(payload.session.updatedAt).getTime() : '';

	return {
		session: payload.session,
		segmentEfforts: payload.segmentEfforts ?? [],
		shareUrl: `${url.origin}/r/${id}?token=${shareToken}`,
		cardImage: `${url.origin}/api/fitness/sessions/${id}/card.webp?token=${shareToken}&v=${ver}`
	};
};
