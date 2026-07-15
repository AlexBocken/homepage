// Types + helpers for the /finances dashboards. The type shapes mirror the JSON
// returned by finance-service (see finance-service/app.py). All money is in the
// operating currency (CHF), valued at market prices, unless a `currency`/`units`
// field says otherwise.

export interface Money {
	number: number | null;
	currency: string;
}

export interface FinanceMeta {
	operating_currency: string;
	operating_currencies: string[];
	title: string | null;
	date_range: { from: string; to: string };
	counts: {
		transactions: number;
		accounts: number;
		prices: number;
		balances: number;
		errors: number;
	};
	roots: Record<string, number>;
	accounts: string[];
	commodities: Record<string, Record<string, string>>;
}

export interface NetWorthPoint {
	date: string;
	/** Present in the default (converted-to-CHF) mode. */
	net?: number | null;
	/** In per-currency mode each native currency is a key (e.g. CHF, EUR, USD). */
	[currency: string]: number | string | null | undefined;
}

export interface NetWorth {
	currency: string;
	basis: 'market' | 'cost';
	by_currency: boolean;
	/** Currencies present in the series: [operating currency] in default mode, or
	 *  every native currency in per-currency mode. */
	currencies: string[];
	from: string;
	to: string;
	step_days: number;
	series: NetWorthPoint[];
	snapshot: { assets: number | null; liabilities: number | null; net: number | null };
	snapshot_by_currency: Record<
		string,
		{ assets?: number | null; liabilities?: number | null }
	>;
}

export interface TreeNode {
	account: string;
	name: string;
	value: number | null;
	children: TreeNode[];
	other?: Record<string, number>;
}

export interface BalanceSheet {
	currency: string;
	date: string;
	sections: TreeNode[];
}

export interface IncomeStatement {
	currency: string;
	from: string;
	to: string;
	sections: TreeNode[];
}

export interface Holding {
	commodity: string;
	name: string;
	asset_class: string | null;
	isin: string | null;
	units: number | null;
	quote_currency: string;
	price: number | null;
	price_date: string | null;
	cost_chf: number | null;
	market_chf: number | null;
	gain_chf: number | null;
	gain_pct: number | null;
	/** Returns + dividends (only on the /investments and /holding endpoints). */
	xirr_pct?: number | null;
	twr_pct?: number | null;
	dividends_chf?: number | null;
	accounts: string[];
}

export interface Holdings {
	currency: string;
	date: string;
	holdings: Holding[];
	totals: {
		cost_chf: number | null;
		market_chf: number | null;
		gain_chf: number | null;
		gain_pct: number | null;
	};
}

export interface TaxWealth {
	currency: string;
	date: string;
	/** Total taxable Assets in CHF (excludes pillar-2 MPS + pillar-3a Frankly). */
	taxable_assets: number | null;
	threshold: number | null;
	/** True when taxable_assets exceeds the threshold → a tax return is required. */
	must_file: boolean;
	excluded: string[];
}

export interface PlPoint {
	date: string;
	cost: number | null;
	market: number | null;
	pl: number | null;
}

export interface PerfSeries {
	commodity: string;
	name: string;
	asset_class: string | null;
	/** % return vs first price, aligned to Performance.dates (null before start). */
	pct: (number | null)[];
}

export interface BenchmarkSeries {
	commodity: string;
	name: string;
	quote_currency: string;
	pct: (number | null)[];
}

export interface Performance {
	dates: string[];
	series: PerfSeries[];
	benchmarks: BenchmarkSeries[];
}

export interface BudgetRow {
	account: string;
	name: string;
	budgeted: number | null;
	actual: number | null;
	remaining: number | null;
	pct: number | null;
}

export interface BudgetMonth {
	month: string;
	budgeted: number | null;
	actual: number | null;
}

export interface BudgetCurrentRow {
	account: string;
	name: string;
	budget: number | null;
	spent: number | null;
	projected: number | null;
	remaining: number | null;
	status: 'ok' | 'watch' | 'over';
}

export interface BudgetCurrent {
	month: string;
	day: number;
	days_in_month: number;
	elapsed_frac: number;
	budgeted: number | null;
	spent: number | null;
	projected: number | null;
	remaining: number | null;
	rows: BudgetCurrentRow[];
}

export interface StreakMonth {
	month: string;
	budgeted: number | null;
	actual: number | null;
	under: boolean;
	has_budget: boolean;
}

export interface Budget {
	currency: string;
	from: string;
	to: string;
	budgeted: number | null;
	actual: number | null;
	remaining: number | null;
	rows: BudgetRow[];
	monthly: BudgetMonth[];
	current: BudgetCurrent;
	streak: { count: number; months: StreakMonth[] };
}

export interface SavingsMonth {
	month: string;
	income: number | null;
	expenses: number | null;
	saved: number | null;
	rate: number | null;
}

export interface SavingsTargetMonth {
	month: string;
	saved: number | null;
	target: number | null;
	hit: boolean;
}

export interface SavingsTarget {
	monthly: number | null;
	streak: number;
	months: SavingsTargetMonth[];
	current: { month: string; saved: number | null; hit: boolean; remaining: number | null };
}

export interface Savings {
	currency: string;
	from: string;
	to: string;
	income: number | null;
	expenses: number | null;
	saved: number | null;
	rate: number | null;
	monthly: SavingsMonth[];
	target: SavingsTarget | null;
}

export interface Investments {
	currency: string;
	from: string;
	to: string;
	date: string;
	holdings: Holding[];
	totals: InvestTotals;
	pl_series: PlPoint[];
	performance: Performance;
}

export interface InvestTotals {
	cost_chf: number | null;
	market_chf: number | null;
	gain_chf: number | null;
	gain_pct: number | null;
	xirr_pct?: number | null;
	twr_pct?: number | null;
	dividends_chf?: number | null;
}

export interface DividendTxn {
	date: string;
	gross: number | null;
	withholding: number | null;
	net: number | null;
	narration: string | null;
}

export interface ValuePoint {
	date: string;
	cost: number | null;
	market: number | null;
}

export interface PricePoint {
	date: string;
	price: number | null;
}

export interface HoldingTxn {
	date: string;
	account: string;
	units: number | null;
	price: number | null;
	cost_currency: string;
	payee: string | null;
	narration: string | null;
}

export interface HoldingDetail {
	currency: string;
	date: string;
	commodity: string;
	name: string;
	isin: string | null;
	asset_class: string | null;
	quote_currency: string;
	accounts: string[];
	current: Holding;
	portfolio_share: number | null;
	transactions: HoldingTxn[];
	dividends: DividendTxn[];
	/** All series on one shared daily date axis, so the charts align on hover. */
	timeline: {
		dates: string[];
		price: (number | null)[];
		market: (number | null)[];
		cost: (number | null)[];
		own: (number | null)[];
		benchmarks: { commodity: string; name: string; pct: (number | null)[] }[];
	};
}

export interface AccountChild {
	account: string;
	name: string;
	total: number | null;
	monthly: (number | null)[];
}

export interface BalancePoint {
	date: string;
	balance: number | null;
}

export interface AccountJournalTxn {
	date: string;
	flag: string;
	payee: string | null;
	narration: string | null;
	tags: string[];
	change: number | null;
	balance: number | null;
	total_chf: number | null;
	postings: Posting[];
	/** Categorizer fields (see CategorizeFields). */
	key?: string;
	bank_amount?: string;
	uncategorized?: boolean;
	current?: string | null;
}

export interface AccountView {
	currency: string;
	account: string;
	from: string;
	to: string;
	balance: number | null;
	opening: number | null;
	months: string[];
	children: AccountChild[];
	balance_series: BalancePoint[];
	journal: AccountJournalTxn[];
	count: number;
}

/** A payee deep-dive: mirrors AccountView but keyed on a payee. `children` are
 *  the Expenses/Income accounts the payee's money flows through; `balance_series`
 *  is the cumulative spend total (not an account balance); journal `balance` is a
 *  running total. */
export interface PayeeView {
	currency: string;
	payee: string;
	from: string;
	to: string;
	total: number | null;
	months: string[];
	children: AccountChild[];
	balance_series: BalancePoint[];
	journal: AccountJournalTxn[];
	count: number;
}

export interface Posting {
	account: string;
	/** This posting's value in CHF. */
	chf?: number | null;
	units?: Money;
	cost?: Money;
	price?: Money;
}

export interface JournalTxn {
	date: string;
	flag: string;
	payee: string | null;
	narration: string | null;
	tags: string[];
	/** Amount attributable to the queried account (CHF), for the drill-down. */
	amount_chf: number | null;
	/** The largest-magnitude leg (CHF) — a meaningful figure for any leg count. */
	total_chf: number | null;
	postings: Posting[];
	/** Categorizer fields (see CategorizeFields). */
	key?: string;
	bank_amount?: string;
	uncategorized?: boolean;
	current?: string | null;
}

/** Per-transaction fields the categorizer needs, computed by finance-service
 *  (the key can't be recomputed client-side — our JSON carries rounded floats).
 *  `key` is the stable content hash; `bank_amount` is the raw Decimal string that
 *  lands in overrides.csv; `current` is the single non-bank account (null when
 *  split); `uncategorized` is true while the txn still hits Expenses/Income:Uncategorized. */
export interface CategorizeFields {
	key: string;
	bank_amount: string;
	uncategorized: boolean;
	current: string | null;
}

/** A row in the uncategorized triage queue (GET /api/finances/categorize). */
export interface CategorizeTxn extends CategorizeFields {
	date: string;
	payee: string;
	narration: string;
	currency: string;
	source: string;
	kind: 'credit' | 'debit';
}

/** Payload of GET /api/finances/categorize: the queue plus the rankable
 *  Expenses/Income accounts and their usage counts. */
export interface CategorizeData {
	txns: CategorizeTxn[];
	accounts: string[];
	usage: Record<string, number>;
}

/** A stored override row (GET /api/finances/overrides), matching overrides.csv. */
export interface OverrideRow {
	key: string;
	account: string;
	date: string;
	amount: string;
	payee: string;
	narration: string;
}

export interface MonthPoint {
	month: string;
	amount: number | null;
}

export interface ExpenseCategory {
	account: string;
	name: string;
	amount: number | null;
}

export interface ExpensePayee {
	payee: string;
	amount: number | null;
	count: number;
}

export interface CashflowCategory {
	account: string;
	name: string;
	total: number | null;
	/** One value per month in `Cashflow.months` order (income positive). */
	monthly: (number | null)[];
}

export interface Cashflow {
	currency: string;
	from: string;
	to: string;
	months: string[];
	income: CashflowCategory[];
	expenses: CashflowCategory[];
	net: (number | null)[];
}

export interface ForecastRow {
	account: string;
	name: string;
	monthly: number | null;
}

export interface Forecast {
	currency: string;
	based_on_months: number;
	income: ForecastRow[];
	expenses: ForecastRow[];
	income_total: number | null;
	expense_total: number | null;
	net: number | null;
}

export interface Expenses {
	currency: string;
	account: string;
	from: string;
	to: string;
	total: number | null;
	count: number;
	avg_per_month: number | null;
	monthly: MonthPoint[];
	by_category: ExpenseCategory[];
	by_payee: ExpensePayee[];
}

export interface Journal {
	total: number;
	limit: number;
	offset: number;
	transactions: JournalTxn[];
}

const CHF = new Intl.NumberFormat('de-CH', {
	style: 'currency',
	currency: 'CHF',
	maximumFractionDigits: 0
});
const CHF2 = new Intl.NumberFormat('de-CH', {
	style: 'currency',
	currency: 'CHF',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** Format a CHF amount. `cents` keeps two decimals; otherwise rounds to whole. */
export function money(n: number | null | undefined, cents = false): string {
	if (n === null || n === undefined) return '–';
	return (cents ? CHF2 : CHF).format(n);
}

const NUM2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format an arbitrary-currency amount (e.g. a native price). Falls back to
 *  "number CODE" for commodity tickers (e.g. LYSP5), which aren't ISO currency
 *  codes and would otherwise make Intl.NumberFormat throw. */
export function amount(n: number | null | undefined, currency: string): string {
	if (n === null || n === undefined) return '–';
	try {
		return new Intl.NumberFormat('de-CH', {
			style: 'currency',
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(n);
	} catch {
		return `${NUM2.format(n)} ${currency}`;
	}
}

/** Signed percent, e.g. "+9.2 %". */
export function percent(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–';
	const s = n > 0 ? '+' : '';
	return `${s}${n.toFixed(1)} %`;
}

/** Short number of units held (drops trailing zeros). */
export function units(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–';
	return new Intl.NumberFormat('de-CH', { maximumFractionDigits: 4 }).format(n);
}

/** Colour class name for a gain: positive / negative / neutral. */
export function gainClass(n: number | null | undefined): 'pos' | 'neg' | 'flat' {
	if (n === null || n === undefined || Math.abs(n) < 0.005) return 'flat';
	return n > 0 ? 'pos' : 'neg';
}
