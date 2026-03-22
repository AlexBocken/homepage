import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [latestRes, listRes] = await Promise.all([
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/measurements?limit=20')
	]);

	return {
		latest: await latestRes.json(),
		measurements: await listRes.json()
	};
};
