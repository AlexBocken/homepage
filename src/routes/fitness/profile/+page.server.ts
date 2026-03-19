import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	console.time('[profile] total load');

	console.time('[profile] auth');
	const session = await locals.auth();
	console.timeEnd('[profile] auth');

	console.time('[profile] fetch /api/fitness/stats/profile');
	const res = await fetch('/api/fitness/stats/profile');
	console.timeEnd('[profile] fetch /api/fitness/stats/profile');

	console.time('[profile] parse json');
	const stats = await res.json();
	console.timeEnd('[profile] parse json');

	console.timeEnd('[profile] total load');
	return { session, stats };
};
