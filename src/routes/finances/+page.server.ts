import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import type {
	BalanceSheet,
	FinanceMeta,
	Forecast,
	Holdings,
	IncomeStatement,
	Journal,
	NetWorth,
	Savings,
	TaxWealth
} from '$lib/utils/finance';

const asJson = async <T>(r: Response): Promise<T | null> => (r.ok ? ((await r.json()) as T) : null);

export const load: PageServerLoad = async ({ fetch, url }) => {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	// from/to for period reports; `date` (=to) for as-of snapshots.
	const range = new URLSearchParams();
	if (from) range.set('from', from);
	if (to) range.set('to', to);
	const rq = range.toString() ? `&${range}` : '';
	const asOf = to ? `?date=${to}` : '';

	// The sidecar is cached and every query is milliseconds, so fetch all panels
	// up front in parallel rather than streaming — streamed promises added
	// fragility (a panel could hang on "Lädt…") for no real latency win here.
	const [metaRes, nwRes, bsRes, incomeRes, holdingsRes, journalRes, taxRes, savingsRes, forecastRes] =
		await Promise.all([
			fetch('/api/finances/meta'),
			fetch(`/api/finances/networth?step=7${rq}`),
			fetch(`/api/finances/balance-sheet${asOf}`),
			fetch(`/api/finances/income-statement?${range}`),
			fetch(`/api/finances/holdings${asOf}`),
			fetch(`/api/finances/journal?limit=15${rq}`),
			fetch('/api/finances/tax-wealth'),
			fetch(`/api/finances/savings?${range}`),
			fetch('/api/finances/forecast')
		]);

	if (!metaRes.ok || !nwRes.ok) {
		throw error(
			metaRes.status === 503 || nwRes.status === 503 ? 503 : 502,
			'Could not load the ledger. Is finance-service running?'
		);
	}

	const meta: FinanceMeta = await metaRes.json();
	const networth: NetWorth = await nwRes.json();
	const balanceSheet = await asJson<BalanceSheet>(bsRes);
	const income = await asJson<IncomeStatement>(incomeRes);
	const holdings = await asJson<Holdings>(holdingsRes);
	const journal = await asJson<Journal>(journalRes);
	const tax = await asJson<TaxWealth>(taxRes);
	const savings = await asJson<Savings>(savingsRes);
	const forecast = await asJson<Forecast>(forecastRes);

	return { meta, networth, balanceSheet, income, holdings, journal, tax, savings, forecast };
};
