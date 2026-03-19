import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const month = url.searchParams.get('month') || '';
	const params = new URLSearchParams({ limit: '50' });
	if (month) params.set('month', month);

	const res = await fetch(`/api/fitness/sessions?${params}`);
	return {
		sessions: await res.json()
	};
};
