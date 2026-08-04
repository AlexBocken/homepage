import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const protein = await fetch('/api/fitness/stats/protein-per-kg?days=365').then(r => (r.ok ? r.json() : null));
	return { protein };
};
