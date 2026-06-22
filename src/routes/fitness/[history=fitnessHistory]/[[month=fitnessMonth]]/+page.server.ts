import type { PageServerLoad } from './$types';

const PAGE = 20;

export const load: PageServerLoad = async ({ fetch }) => {
	// First page of the (unfiltered) infinite list; the client takes over for
	// paging + filtering.
	const res = await fetch(`/api/fitness/sessions?limit=${PAGE}&offset=0`);
	const data = res.ok ? await res.json() : { sessions: [], total: 0 };
	return {
		initial: data.sessions ?? [],
		total: data.total ?? 0,
		pageSize: PAGE
	};
};
