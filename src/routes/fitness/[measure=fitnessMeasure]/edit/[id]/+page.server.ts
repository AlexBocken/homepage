import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const res = await fetch(`/api/fitness/measurements/${params.id}`);
	if (!res.ok) return { measurement: null };
	return { measurement: await res.json() };
};
