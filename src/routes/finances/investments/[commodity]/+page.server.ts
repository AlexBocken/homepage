import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { HoldingDetail } from '$lib/utils/finance';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const commodity = params.commodity;
	const range = new URLSearchParams();
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from) range.set('from', from);
	if (to) range.set('to', to);
	const res = await fetch(
		`/api/finances/holding?commodity=${encodeURIComponent(commodity)}&step=7&${range}`
	);
	if (!res.ok) {
		if (res.status === 404) throw error(404, `${commodity} ist keine gehaltene Position.`);
		throw error(res.status === 503 ? 503 : 502, 'Could not load holding.');
	}
	const detail: HoldingDetail = await res.json();
	return { detail };
};
