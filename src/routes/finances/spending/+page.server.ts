import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { Cashflow, Expenses, Journal } from '$lib/utils/finance';

const asJson = async <T>(r: Response): Promise<T | null> => (r.ok ? ((await r.json()) as T) : null);

export const load: PageServerLoad = async ({ fetch, url }) => {
	// `account` focuses the page on a subtree; absent = all expenses (no highlight).
	const account = url.searchParams.get('account') || 'Expenses';
	const enc = encodeURIComponent(account);
	const payee = url.searchParams.get('payee');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const range = new URLSearchParams();
	if (from) range.set('from', from);
	if (to) range.set('to', to);
	const rq = range.toString() ? `&${range}` : '';
	const payeeQ = payee ? `&payee=${encodeURIComponent(payee)}` : '';

	const [cashflowRes, expRes, jrnRes] = await Promise.all([
		fetch(`/api/finances/cashflow?${range}`),
		fetch(`/api/finances/expenses?account=${enc}${rq}`),
		fetch(`/api/finances/journal?account=${enc}&limit=100${rq}${payeeQ}`)
	]);

	if (!expRes.ok) {
		throw error(
			expRes.status === 503 ? 503 : 502,
			'Could not load spending. Is finance-service running?'
		);
	}

	const expenses: Expenses = await expRes.json();
	const journal = await asJson<Journal>(jrnRes);
	const cashflow = await asJson<Cashflow>(cashflowRes);

	return { account, payee, expenses, journal, cashflow };
};
