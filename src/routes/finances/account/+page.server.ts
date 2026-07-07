import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type { BalanceSheet, IncomeStatement } from '$lib/utils/finance';

const asJson = async <T>(r: Response): Promise<T | null> => (r.ok ? ((await r.json()) as T) : null);

export const load: PageServerLoad = async ({ fetch, url }) => {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const range = new URLSearchParams();
	if (from) range.set('from', from);
	if (to) range.set('to', to);
	// Balance sheet is a point-in-time snapshot → value it at the range end.
	const asOf = to ? `?date=${to}` : '';

	const [bsRes, incRes] = await Promise.all([
		fetch(`/api/finances/balance-sheet${asOf}`),
		fetch(`/api/finances/income-statement?${range}`)
	]);

	if (!bsRes.ok) {
		throw error(bsRes.status === 503 ? 503 : 502, 'Could not load accounts. Is finance-service running?');
	}
	const balanceSheet: BalanceSheet = await bsRes.json();
	const income = await asJson<IncomeStatement>(incRes);
	return { balanceSheet, income };
};
