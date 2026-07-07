import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { AccountView } from '$lib/utils/finance';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const account = params.account;
	const range = new URLSearchParams();
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from) range.set('from', from);
	if (to) range.set('to', to);

	const res = await fetch(`/api/finances/account?account=${encodeURIComponent(account)}&${range}`);
	if (!res.ok) {
		throw error(res.status === 503 ? 503 : 502, 'Could not load account. Is finance-service running?');
	}
	const view: AccountView = await res.json();
	return { view };
};
