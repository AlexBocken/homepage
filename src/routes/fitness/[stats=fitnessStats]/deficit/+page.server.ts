import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const balance = await fetch('/api/fitness/stats/daily-balance?days=365').then(r => (r.ok ? r.json() : null));
	return { balance };
};
