import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { Budget, FinanceMeta, Savings } from '$lib/utils/finance';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const range = new URLSearchParams();
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (from) range.set('from', from);
	if (to) range.set('to', to);

	const [res, metaRes, savingsRes] = await Promise.all([
		fetch(`/api/finances/budget?${range}`),
		fetch('/api/finances/meta'),
		fetch('/api/finances/savings')
	]);
	if (!res.ok) {
		throw error(res.status === 503 ? 503 : 502, 'Could not load budget. Is finance-service running?');
	}
	const budget: Budget = await res.json();
	const meta: FinanceMeta | null = metaRes.ok ? await metaRes.json() : null;
	const savings: Savings | null = savingsRes.ok ? await savingsRes.json() : null;
	const expenseAccounts = (meta?.accounts ?? []).filter((a) => a.startsWith('Expenses:'));
	return { budget, expenseAccounts, savingsTarget: savings?.target ?? null };
};
