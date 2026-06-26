import type { PageLoad } from './$types';
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';

/**
 * Build a detail-page session object from a queued (unsynced) POST body. The
 * server normally computes volume/kcal/PRs at save time; for an unsynced run we
 * only have the raw payload, so we derive the cheap stats (duration, volume)
 * client-side and let the rest stay absent (the page degrades gracefully).
 * @param {{ id: number, data: any }} entry
 */
function buildQueuedSession(entry: { id: number; data: any }) {
	const d = entry.data;
	const duration =
		d.startTime && d.endTime
			? Math.max(0, Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60000))
			: undefined;
	let totalVolume = 0;
	for (const ex of d.exercises ?? []) {
		for (const s of ex.sets ?? []) {
			if (s.weight && s.reps) totalVolume += s.weight * s.reps;
		}
	}
	return { ...d, _id: `queued-${entry.id}`, duration, totalVolume: totalVolume || undefined };
}

export const load: PageLoad = async ({ params, data }) => {
	if (!params.id.startsWith('queued-')) return data;

	// IndexedDB only exists in the browser. On SSR (direct URL hit) we can't read
	// the outbox; the page renders a "device-only" notice until hydration.
	if (!browser) return { ...data, session: null, unsynced: true };

	const { getQueuedSessions } = await import('$lib/offline/fitnessQueue');
	const qid = Number(params.id.slice('queued-'.length));
	const entry = (await getQueuedSessions()).find((e) => e.id === qid);
	if (!entry) error(404, 'Session not found');

	return { ...data, session: buildQueuedSession(entry), unsynced: true };
};
