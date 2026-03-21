import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [templatesRes, scheduleRes] = await Promise.all([
		fetch('/api/fitness/templates'),
		fetch('/api/fitness/schedule')
	]);

	return {
		templates: await templatesRes.json(),
		schedule: await scheduleRes.json()
	};
};
