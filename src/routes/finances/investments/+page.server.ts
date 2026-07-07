import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { Investments } from '$lib/utils/finance';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const range = new URLSearchParams();
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from) range.set('from', from);
	if (to) range.set('to', to);
	const res = await fetch(`/api/finances/investments?step=7&${range}`);
	if (!res.ok) {
		throw error(
			res.status === 503 ? 503 : 502,
			'Could not load investments. Is finance-service running?'
		);
	}
	const investments: Investments = await res.json();
	return { investments };
};
