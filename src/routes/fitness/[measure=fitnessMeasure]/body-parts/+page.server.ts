import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/fitness/measurements?limit=100');
	const list = res.ok ? await res.json() : { measurements: [] };
	return {
		measurements: list.measurements ?? []
	};
};
