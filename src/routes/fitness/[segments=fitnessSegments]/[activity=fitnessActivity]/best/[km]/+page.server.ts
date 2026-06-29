import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
	// Distance carries a "k" suffix in the URL (e.g. "3k"); strip it to the number.
	const km = Number(String(params.km).replace(/k$/i, ''));
	if (!Number.isInteger(km) || km <= 0) throw error(404, 'Not found');
	// Guaranteed 'running' | 'cycling' by the fitnessActivity matcher.
	const activity = params.activity as 'running' | 'cycling';

	const res = await fetch(`/api/fitness/stats/best-efforts/history?km=${km}&activity=${activity}`);
	if (!res.ok) throw error(res.status === 404 ? 404 : 500, 'Failed to load best-effort history');
	const data = await res.json();

	return {
		km,
		activity,
		history: (data.history ?? []) as Array<{
			sessionId: string;
			name: string;
			date: string;
			seconds: number;
			pace: number;
		}>
	};
};
