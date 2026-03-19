import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const session = await locals.auth();
	const res = await fetch('/api/fitness/stats/overview');
	const stats = await res.json();
	return { session, stats };
};
