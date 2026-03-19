import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/fitness/templates');
	return {
		templates: await res.json()
	};
};
