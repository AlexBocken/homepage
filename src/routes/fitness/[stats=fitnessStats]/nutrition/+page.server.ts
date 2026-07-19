import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const days = url.searchParams.get('days') === '30' ? 30 : 7;

	const [micronutrients, nutritionStats] = await Promise.all([
		fetch(`/api/fitness/stats/micronutrients?days=${days}`).then(r => (r.ok ? r.json() : null)),
		// The macro split hero mirrors the stats page card exactly, so it reuses the
		// same endpoint rather than recomputing the target logic.
		fetch('/api/fitness/stats/nutrition').then(r => (r.ok ? r.json() : null)),
	]);

	return { days, micronutrients, nutritionStats };
};
