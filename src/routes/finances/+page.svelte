<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import AccountTree from '$lib/components/finance/AccountTree.svelte';
	import TransactionDetail from '$lib/components/finance/TransactionDetail.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { money, amount, percent, units as fmtUnits, gainClass } from '$lib/utils/finance';
	import type { BalanceSheet, Holdings, IncomeStatement, NetWorth, TreeNode } from '$lib/utils/finance';
	import type { PageData } from './$types';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang } from '$lib/js/financesI18n';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Scale from '@lucide/svelte/icons/scale';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let { data }: { data: PageData } = $props();
	const t = $derived(financesM[financesLang(languageStore.value)]);

	// Any account links to the spending page focused on it (drill-down + analytics).
	// resolve() is inlined at direct href sites; AccountTree takes this as a prop
	// (same prop-href pattern as EditButton/AddButton).
	const spendingQuery = (acct: string) => (acct === 'Expenses' ? '' : `?account=${encodeURIComponent(acct)}`);
	const spendingHref = (acct: string) => `${resolve('/finances/spending')}${spendingQuery(acct)}`;

	// Booking detail modal + find-by-recipient (jumps to the spending page).
	let detail = $state<import('$lib/utils/finance').JournalTxn | null>(null);
	const payeeHref = (p: string) => `${resolve('/finances/spending')}?payee=${encodeURIComponent(p)}`;
	const accountHref = (a: string) => resolve('/finances/account/[account]', { account: a });
	function findPayee(p: string) {
		detail = null;
		goto(payeeHref(p));
	}
	function goAccount(a: string) {
		detail = null;
		goto(accountHref(a));
	}

	// Valuation basis (market vs cost, like Fava — default market) and currency
	// mode (convert everything to CHF — default — vs one line per native
	// currency). Both drive a client-side refetch of the aggregate views.
	let basis = $state<'market' | 'cost'>('market');
	let perCurrency = $state(false);

	// Aggregate data the toggles refetch. Both fall back to the SSR load so the
	// page paints instantly, then use the override once a toggle refetches.
	let nwOverride = $state<NetWorth | null>(null);
	let bsOverride = $state<BalanceSheet | null>(null);
	let loading = $state(false);

	const nw = $derived(nwOverride ?? data.networth);
	const bs = $derived(bsOverride ?? data.balanceSheet);
	const h = $derived(data.holdings);
	const inc = $derived(data.income);
	const jrnl = $derived(data.journal);

	const snap = $derived(nw.snapshot);
	const range = $derived(data.meta.date_range);

	const currencyColors: Record<string, string> = {
		CHF: '#88C0D0',
		EUR: '#A3BE8C',
		USD: '#EBCB8B',
		GBP: '#B48EAD'
	};
	const curColor = (c: string) => currencyColors[c] ?? '#D08770';

	const chartData = $derived(
		nw.by_currency
			? {
					dates: nw.series.map((p) => p.date),
					datasets: nw.currencies.map((c) => ({
						label: c,
						data: nw.series.map((p) => (p[c] as number | null) ?? null),
						borderColor: curColor(c),
						backgroundColor: 'transparent',
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.25,
						fill: false
					}))
				}
			: {
					dates: nw.series.map((p) => p.date),
					datasets: [
						{
							label: t.ov_networth,
							data: nw.series.map((p) => p.net ?? null),
							borderColor: '#88C0D0',
							backgroundColor: 'rgba(136, 192, 208, 0.15)',
							borderWidth: 2,
							pointRadius: 0,
							tension: 0.25,
							fill: true
						}
					]
				}
	);

	// Per-currency amounts are native (not CHF), so format each line's tooltip in
	// its own currency; the single net-worth line is always CHF.
	const tooltip = (value: number, datasetIndex: number) =>
		nw.by_currency ? amount(value, nw.currencies[datasetIndex] ?? 'CHF') : money(value);

	// FitnessChart builds its canvas once and doesn't sync later `data` changes,
	// so remount it (via {#key}) whenever the series shape OR the range changes.
	const chartKey = $derived(`${nw.by_currency}:${nw.basis}:${nw.currencies.join(',')}:${page.url.search}`);

	// A range change navigates (new ?from&to); drop the toggle overrides so the
	// fresh load data for the new range is shown (a later toggle refetches it).
	afterNavigate(() => {
		nwOverride = null;
		bsOverride = null;
	});

	// Monthly amount saved (income − expenses) — bars coloured by sign. We chart
	// the CHF amount, not the ratio, so a near-zero-income month can't blow up.
	const savingsChart = $derived(
		data.savings
			? {
					labels: data.savings.monthly.map((m) => m.month),
					datasets: [
						{
							label: t.saved_word,
							data: data.savings.monthly.map((m) => m.saved),
							// per-bar colours (green save / red dissave); Chart.js accepts an
							// array, FitnessChart's type only says string.
							backgroundColor: data.savings.monthly.map((m) =>
								(m.saved ?? 0) >= 0 ? '#A3BE8C' : '#BF616A'
							) as unknown as string,
							borderRadius: 4
						}
					]
				}
			: null
	);
	const savingsRate = $derived(data.savings?.rate == null ? '–' : `${data.savings.rate.toFixed(1)} %`);

	async function refetch() {
		loading = true;
		const q = new URLSearchParams({ step: '7', basis });
		if (perCurrency) q.set('by_currency', 'true');
		const from = page.url.searchParams.get('from');
		const to = page.url.searchParams.get('to');
		if (from) q.set('from', from);
		if (to) q.set('to', to);
		try {
			const bsUrl = new URLSearchParams({ basis });
			if (to) bsUrl.set('date', to);
			const [nwR, bsR] = await Promise.all([
				fetch(`/api/finances/networth?${q}`),
				fetch(`/api/finances/balance-sheet?${bsUrl}`)
			]);
			if (nwR.ok) nwOverride = await nwR.json();
			if (bsR.ok) bsOverride = await bsR.json();
		} finally {
			loading = false;
		}
	}

	function setBasis(b: 'market' | 'cost') {
		if (b === basis) return;
		basis = b;
		refetch();
	}

	/** Portfolio market value grouped by asset class. */
	function allocation(h: Holdings): Array<[string, number]> {
		const by: Record<string, number> = {};
		for (const row of h.holdings) {
			const k = row.asset_class ?? 'other';
			by[k] = (by[k] ?? 0) + (row.market_chf ?? 0);
		}
		return Object.entries(by).sort((a, b) => b[1] - a[1]);
	}

	const classColors: Record<string, string> = {
		stock: '#5E81AC',
		pension: '#A3BE8C',
		cash: '#EBCB8B',
		bond: '#B48EAD',
		other: '#D08770'
	};
	const classColor = (k: string) => classColors[k] ?? '#4C566A';

	/** Top expense categories (level-2 children of Expenses), largest first. */
	function topExpenses(inc: IncomeStatement, n = 6): TreeNode[] {
		const exp = inc.sections.find((s) => s.name === 'Expenses');
		if (!exp) return [];
		return [...exp.children].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, n);
	}
	const sectionTotal = (inc: IncomeStatement, name: string) =>
		inc.sections.find((s) => s.name === name)?.value ?? 0;
</script>

<svelte:head><title>{t.title_overview}</title></svelte:head>

<!-- Net-worth hero -->
<section class="hero">
	<div class="hero-top">
		<div class="kpis">
			<div class="kpi big">
				<span class="label">{t.ov_networth}{basis === 'cost' ? ` (${t.at_cost})` : ''}</span>
				<span class="figure">{money(snap.net)}</span>
			</div>
			<div class="kpi">
				<span class="label">{t.assets_label}</span>
				<span class="figure pos">{money(snap.assets)}</span>
			</div>
			<div class="kpi">
				<span class="label">{t.liabilities_label}</span>
				<span class="figure neg">{money(snap.liabilities)}</span>
			</div>
		</div>

		<div class="controls" class:busy={loading}>
			<div class="seg" role="group" aria-label={t.valuation}>
				<button class:active={basis === 'market'} onclick={() => setBasis('market')}>{t.market_value}</button>
				<button class:active={basis === 'cost'} onclick={() => setBasis('cost')}>{t.cost_label}</button>
			</div>
			<Toggle bind:checked={perCurrency} label={t.ov_per_currency} onchange={refetch} />
		</div>
	</div>

	<p class="range">{range.from} – {range.to} · {data.meta.counts.transactions} {t.bookings}</p>

	{#if perCurrency}
		<div class="exposure">
			{#each nw.currencies as c (c)}
				{@const a = nw.snapshot_by_currency[c]}
				<span class="chip">
					<span class="dot" style="background: {curColor(c)}"></span>
					{c} {amount((a?.assets ?? 0) + (a?.liabilities ?? 0), c)}
				</span>
			{/each}
		</div>
	{/if}

	<div class="chart-wrap">
		<!-- FitnessChart builds its canvas once and doesn't sync later `data`
		     changes, so remount it (via {#key}) when the series shape changes. -->
		{#key chartKey}
			<FitnessChart type="line" height="280px" data={chartData} tooltipFormatter={tooltip} />
		{/key}
	</div>
</section>

<!-- Tax-return threshold: taxable wealth (excl. pillar-2 MPS + pillar-3a Frankly)
     vs the 80k CHF filing threshold. -->
{#if data.tax}
	{@const pct = Math.min(100, ((data.tax.taxable_assets ?? 0) / (data.tax.threshold || 1)) * 100)}
	<section class="tax" class:warn={data.tax.must_file}>
		<div class="tax-head">
			<span class="tax-status">
				{#if data.tax.must_file}<TriangleAlert size={18} strokeWidth={2} color="var(--orange)" />{:else}<ShieldCheck size={18} strokeWidth={2} color="var(--green)" />{/if}
				{data.tax.must_file ? t.tax_required : t.tax_ok}
			</span>
			<span class="tax-fig">
				{money(data.tax.taxable_assets)} <span class="tax-of">/ {money(data.tax.threshold)}</span>
			</span>
		</div>
		<div class="tax-track">
			<span class="tax-fill" style="width: {pct}%"></span>
		</div>
		<p class="tax-note">
			{t.tax_note_base}
			{data.tax.must_file ? t.tax_over : t.tax_under}
		</p>
	</section>
{/if}

<div class="grid">
	<!-- Savings rate -->
	{#if data.savings && savingsChart}
		<section class="card wide">
			<h2><PiggyBank size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.ov_savings_rate} <span class="basis-tag">{savingsRate}</span></h2>
			<div class="totals">
				<div><span class="t-label">{t.saved_word}</span><strong class="pos">{money(data.savings.saved)}</strong></div>
				<div><span class="t-label">{t.income}</span><strong>{money(data.savings.income)}</strong></div>
				<div><span class="t-label">{t.expenses}</span><strong class="neg">{money(data.savings.expenses)}</strong></div>
			</div>
			{#key chartKey}
				<FitnessChart type="bar" height="200px" data={savingsChart} tooltipFormatter={(v: number) => money(v, true)} />
			{/key}
		</section>
	{/if}

	<!-- Portfolio -->
	<section class="card wide">
		<h2><ChartPie size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.portfolio}</h2>
		{#if h && h.holdings.length}
				<div class="totals">
					<div><span class="t-label">{t.market_value}</span><strong>{money(h.totals.market_chf)}</strong></div>
					<div><span class="t-label">{t.cost_basis}</span><strong>{money(h.totals.cost_chf)}</strong></div>
					<div>
						<span class="t-label">{t.gain}</span>
						<strong class="trend {gainClass(h.totals.gain_chf)}">
							{#if (h.totals.gain_chf ?? 0) >= 0}<TrendingUp size={16} strokeWidth={2} />{:else}<TrendingDown size={16} strokeWidth={2} />{/if}
							{money(h.totals.gain_chf)} ({percent(h.totals.gain_pct)})
						</strong>
					</div>
				</div>

				<!-- Allocation bar -->
				{@const alloc = allocation(h)}
				{@const total = alloc.reduce((s, [, v]) => s + v, 0) || 1}
				<div class="alloc-bar">
					{#each alloc as [cls, val] (cls)}
						<span
							class="alloc-seg"
							style="width: {(val / total) * 100}%; background: {classColor(cls)}"
							title="{cls}: {money(val)}"
						></span>
					{/each}
				</div>
				<div class="alloc-legend">
					{#each alloc as [cls, val] (cls)}
						<span class="leg">
							<span class="dot" style="background: {classColor(cls)}"></span>
							{cls} · {money(val)}
						</span>
					{/each}
				</div>

				<div class="table-scroll">
					<table class="fin-table">
						<thead>
							<tr>
								<th>{t.security}</th><th class="r">{t.units_col}</th><th class="r">{t.price}</th>
								<th class="r">{t.market_value}</th><th class="r">{t.gain}</th>
							</tr>
						</thead>
						<tbody>
							{#each h.holdings as row (row.commodity)}
								<tr>
									<td>
										<a class="tlink" href={resolve('/finances/investments/[commodity]', { commodity: row.commodity })}>
											<span class="ticker">{row.commodity}</span>
											<span class="cname">{row.name}</span>
										</a>
									</td>
									<td class="r num" data-label={t.units_col}>{fmtUnits(row.units)}</td>
									<td class="r num" data-label={t.price}>{row.price ?? '–'} {row.quote_currency}</td>
									<td class="r num" data-label={t.market_value}>{money(row.market_chf)}</td>
									<td class="r num {gainClass(row.gain_chf)}" data-label={t.gain}>
										{money(row.gain_chf)}<br /><small>{percent(row.gain_pct)}</small>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="muted">{t.ov_no_securities}</p>
			{/if}
	</section>

	<!-- Income vs expenses -->
	<section class="card">
		<h2><ArrowUpDown size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.income_statement}</h2>
		{#if inc}
				{@const income = sectionTotal(inc, 'Income')}
				{@const expenses = sectionTotal(inc, 'Expenses')}
				<div class="ie">
					<div><span class="t-label">{t.income}</span><strong class="pos">{money(income)}</strong></div>
					<div><span class="t-label">{t.expenses}</span><strong class="neg">{money(expenses)}</strong></div>
					<div><span class="t-label">{t.balance}</span><strong class="trend {gainClass(income - expenses)}">{#if income - expenses >= 0}<TrendingUp size={16} strokeWidth={2} />{:else}<TrendingDown size={16} strokeWidth={2} />{/if} {money(income - expenses)}</strong></div>
				</div>
				<h3>{t.ov_top_expenses}</h3>
				<ul class="cats">
					{#each topExpenses(inc) as cat (cat.account)}
						{@const pct = expenses ? ((cat.value ?? 0) / expenses) * 100 : 0}
						<li>
							<a class="cat-link" href={`${resolve('/finances/spending')}${spendingQuery(cat.account)}`} title={t.view_spending}>
								<span class="cat-name">{cat.name}</span>
								<span class="cat-bar"><span style="width: {pct}%"></span></span>
								<span class="cat-val">{money(cat.value)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">{t.unavailable}</p>
			{/if}
	</section>

	<!-- Typical-month forecast (mean of complete past months) -->
	{#if data.forecast && data.forecast.based_on_months > 0}
		{@const fc = data.forecast}
		{@const expMax = Math.max(1, ...fc.expenses.map((e) => e.monthly ?? 0))}
		<section class="card">
			<h2><CalendarClock size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.ov_typical_month} <span class="basis-tag fin-num">Ø {fc.based_on_months} {t.ov_months_abbr}</span></h2>
			<div class="ie">
				<div><span class="t-label">{t.income}</span><strong class="pos fin-num">{money(fc.income_total)}</strong></div>
				<div><span class="t-label">{t.expenses}</span><strong class="neg fin-num">{money(fc.expense_total)}</strong></div>
				<div><span class="t-label">{t.net}</span><strong class="{gainClass(fc.net)} fin-num">{money(fc.net)}</strong></div>
			</div>
			<h3>{t.ov_expense_estimate}</h3>
			<ul class="cats">
				{#each fc.expenses.slice(0, 6) as c (c.account)}
					{@const pct = ((c.monthly ?? 0) / expMax) * 100}
					<li>
						<a class="cat-link" href={`${resolve('/finances/spending')}${spendingQuery(c.account)}`} title={t.view_spending}>
							<span class="cat-name">{c.name}</span>
							<span class="cat-bar"><span style="width: {pct}%"></span></span>
							<span class="cat-val fin-num">{money(c.monthly)}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Balance sheet -->
	<section class="card">
		<h2><Scale size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.balance_sheet} <span class="basis-tag">{basis === 'cost' ? t.at_cost : t.market_value}</span></h2>
		{#if bs}
			{#each bs.sections as sect (sect.account)}
				<div class="tree"><AccountTree node={sect} hrefFor={accountHref} /></div>
			{/each}
		{:else}
			<p class="muted">{t.unavailable}</p>
		{/if}
	</section>

	<!-- Recent journal -->
	<section class="card wide">
		<h2><ReceiptText size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.ov_recent}</h2>
		{#if jrnl}
			<div class="table-scroll">
				<table class="journal fin-table">
					<tbody>
						{#each jrnl.transactions as row, i (i)}
							<tr class="jrow" onclick={() => (detail = row)} title={t.details_view}>
								<td class="jflag hide-sm">{row.postings.length > 2 ? '⑃' : ''}</td>
								<td class="jdate" data-label={t.date_col}>{row.date}</td>
								<td class="jpayee" class:hide-sm={!row.payee} data-label={t.payee_col}>
									{#if row.payee}
										<a href={payeeHref(row.payee)} onclick={(e) => { e.stopPropagation(); e.preventDefault(); findPayee(row.payee ?? ''); }}>{row.payee}</a>
									{/if}
								</td>
								<td class="jnarr" class:hide-sm={!row.narration} data-label={t.narration_col}>{row.narration ?? ''}</td>
								<td class="r num" data-label={t.amount_col}>{money(row.total_chf, true)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="muted">{t.unavailable}</p>
		{/if}
	</section>
</div>

{#if detail}
	<TransactionDetail txn={detail} onClose={() => (detail = null)} onPayee={findPayee} onAccount={goAccount} />
{/if}

<style>
	.hero {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	.hero-top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
	}
	.kpis {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: baseline;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		transition: opacity var(--transition-normal);
	}
	.controls.busy {
		opacity: 0.5;
	}
	.seg {
		display: inline-flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
	}
	.seg button {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}
	.seg button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.exposure {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 0.25rem 0 0.75rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.3rem 0.75rem;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.basis-tag {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.label,
	.t-label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.figure {
		font-size: var(--text-xl);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.kpi.big .figure {
		font-size: var(--text-3xl);
	}
	.range {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		margin: 0.75rem 0 0.5rem;
	}
	.chart-wrap {
		margin-top: 0.5rem;
	}

	.tax {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 4px solid var(--green);
		border-radius: var(--radius-card);
		padding: 1rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	.tax.warn {
		border-left-color: var(--orange);
	}
	.tax-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}
	.tax-status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.tax-fig {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.tax-of {
		color: var(--color-text-tertiary);
		font-weight: 400;
	}
	.tax-track {
		position: relative;
		height: 0.55rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		margin: 0.6rem 0 0.5rem;
		overflow: hidden;
	}
	.tax-fill {
		display: block;
		height: 100%;
		background: var(--green);
		border-radius: var(--radius-pill);
	}
	.tax.warn .tax-fill {
		background: var(--orange);
	}
	.tax-note {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
	}
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
	}
	.card.wide {
		grid-column: 1 / -1;
	}
	h2 {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 0 1rem;
		font-size: var(--text-lg);
		color: var(--color-text-primary);
	}
	.trend {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	h3 {
		margin: 1.25rem 0 0.5rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	.totals,
	.ie {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-bottom: 1rem;
	}
	.totals div,
	.ie div {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.totals strong,
	.ie strong {
		font-size: var(--text-lg);
		font-variant-numeric: tabular-nums;
	}

	.pos {
		color: var(--green);
	}
	.neg {
		color: var(--red);
	}
	.flat {
		color: var(--color-text-primary);
	}

	.alloc-bar {
		display: flex;
		height: 0.9rem;
		border-radius: var(--radius-pill);
		overflow: hidden;
		margin-bottom: 0.5rem;
	}
	.alloc-seg {
		display: block;
		height: 100%;
	}
	.alloc-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.leg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
	}

	.table-scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 0.45rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	}
	th {
		color: var(--color-text-secondary);
		font-weight: 600;
		white-space: nowrap;
	}
	.r {
		text-align: right;
	}
	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.tlink {
		display: block;
		text-decoration: none;
	}
	.tlink:hover .ticker {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.ticker {
		font-weight: 600;
		color: var(--color-text-primary);
		display: block;
	}
	.cname {
		color: var(--color-text-tertiary);
		font-size: 0.8em;
	}

	.cats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.cat-link {
		display: grid;
		grid-template-columns: 8rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		font-size: var(--text-sm);
		text-decoration: none;
		padding: 0.2rem 0.35rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	.cat-link:hover {
		background: var(--color-bg-elevated);
	}
	.cat-name {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cat-bar {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		height: 0.5rem;
		overflow: hidden;
	}
	.cat-bar span {
		display: block;
		height: 100%;
		background: var(--color-primary);
	}
	.cat-val {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.fin-num {
		font-family: var(--font-fin-num);
		font-variant-numeric: tabular-nums;
	}

	.tree {
		margin-bottom: 1rem;
	}

	.jrow {
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.jrow:hover {
		background: var(--color-bg-elevated);
	}
	.jflag {
		color: var(--color-text-tertiary);
		text-align: center;
		width: 1.2rem;
	}
	.journal .jpayee a {
		color: inherit;
		text-decoration: none;
	}
	.journal .jpayee a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.journal .jdate {
		color: var(--color-text-tertiary);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.journal .jpayee {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.journal .jnarr {
		color: var(--color-text-secondary);
	}

	@media (max-width: 700px) {
		.grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.kpi.big .figure {
			font-size: var(--text-2xl);
		}
		.cats li {
			grid-template-columns: 6rem 1fr auto;
		}
	}
</style>
