import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [latestRes, listRes, goalRes, periodRes, shareRes] = await Promise.all([
		fetch('/api/fitness/measurements/latest'),
		fetch('/api/fitness/measurements?limit=10'),
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/period').catch(() => null),
		fetch('/api/fitness/period/share').catch(() => null)
	]);

	return {
		latest: await latestRes.json(),
		measurements: await listRes.json(),
		profile: goalRes.ok ? await goalRes.json() : {},
		periods: periodRes?.ok ? (await periodRes.json()).entries : [],
		periodSharedWith: shareRes?.ok ? (await shareRes.json()).sharedWith : []
	};
};
