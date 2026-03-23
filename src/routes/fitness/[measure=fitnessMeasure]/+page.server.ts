import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [latestRes, listRes, goalRes] = await Promise.all([
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/measurements?limit=20'),
		fetch('/api/fitness/goal')
	]);

	return {
		latest: await latestRes.json(),
		measurements: await listRes.json(),
		profile: goalRes.ok ? await goalRes.json() : {}
	};
};
