import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { PayeeView } from '$lib/utils/finance';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const payee = params.payee;
	const range = new URLSearchParams();
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from) range.set('from', from);
	if (to) range.set('to', to);

	const res = await fetch(`/api/finances/payee?payee=${encodeURIComponent(payee)}&${range}`);
	if (!res.ok) {
		throw error(res.status === 503 ? 503 : 502, 'Could not load payee. Is finance-service running?');
	}
	const view: PayeeView = await res.json();
	return { view };
};
