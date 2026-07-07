<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import CashflowChart from '$lib/components/finance/CashflowChart.svelte';
	import TransactionDetail from '$lib/components/finance/TransactionDetail.svelte';
	import { money } from '$lib/utils/finance';
	import type { JournalTxn } from '$lib/utils/finance';
	import type { PageData } from './$types';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang } from '$lib/js/financesI18n';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Tags from '@lucide/svelte/icons/tags';
	import Store from '@lucide/svelte/icons/store';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';

	let { data }: { data: PageData } = $props();

	const t = $derived(financesM[financesLang(languageStore.value)]);

	const exp = $derived(data.expenses);
	const jrnl = $derived(data.journal);

	// Open a full-detail modal for a booking; click a recipient to filter by it.
	let detail = $state<JournalTxn | null>(null);
	function payeeHref(p: string) {
		const q = new URLSearchParams(page.url.searchParams);
		q.set('payee', p);
		return `${resolve('/finances/spending')}?${q}`;
	}
	function findPayee(p: string) {
		detail = null;
		goto(payeeHref(p));
	}
	function clearPayee() {
		const q = new URLSearchParams(page.url.searchParams);
		q.delete('payee');
		goto(`${resolve('/finances/spending')}${q.toString() ? `?${q}` : ''}`);
	}

	// Cashflow chart view: split (stacked by category) vs total (net bar per month).
	let cfMode = $state<'split' | 'total'>('split');

	// Income postings are credits (negative); when the focus is an income account,
	// flip the displayed sign so amounts read positive, and relabel accordingly.
	const isIncome = $derived(exp.account === 'Income' || exp.account.startsWith('Income:'));
	const disp = (n: number | null | undefined) => (n == null ? null : isIncome ? -n : n);

	// Href for an account focus (no query = the default all-expenses view).
	// resolve() is inlined at each href site (repo convention) for the router lint.
	const query = (acct: string) => (acct === 'Expenses' ? '' : `?account=${encodeURIComponent(acct)}`);

	// Category rows deep-link to the Fava-style account page.
	const accountHref = (a: string) => resolve('/finances/account/[account]', { account: a });

	// Click a stacked-bar segment (income or expense category) to filter to it.
	function focusAccount(account: string) {
		goto(`${resolve('/finances/spending')}${query(account)}`);
	}

	// Breadcrumb from the focused account path.
	const crumbs = $derived.by(() => {
		const segs = exp.account.split(':');
		let acc = '';
		return segs.map((seg, i) => {
			acc = i === 0 ? seg : `${acc}:${seg}`;
			const rootLabel = seg === 'Expenses' ? t.sp_all_expenses : seg === 'Income' ? t.sp_all_income : seg;
			return {
				label: i === 0 ? rootLabel : seg,
				account: acc,
				isLast: i === segs.length - 1
			};
		});
	});

	const kind = $derived(isIncome ? t.income : t.expenses);

	// Monthly-trend bar chart (category axis so month labels read cleanly).
	const trend = $derived({
		labels: exp.monthly.map((m) => m.month),
		datasets: [
			{
				label: kind,
				data: exp.monthly.map((m) => disp(m.amount)),
				backgroundColor: isIncome ? '#A3BE8C' : '#BF616A',
				borderRadius: 4
			}
		]
	});

	// Category breakdown: skip when we've drilled to a single leaf.
	const cats = $derived(exp.by_category.filter((c) => c.account !== exp.account));
	const catMax = $derived(Math.max(1, ...cats.map((c) => disp(c.amount) ?? 0)));
	const payMax = $derived(Math.max(1, ...exp.by_payee.map((p) => disp(p.amount) ?? 0)));
</script>

<svelte:head><title>{t.title_spending}</title></svelte:head>

<!-- Breadcrumb -->
<nav class="crumbs" aria-label={t.sp_path}>
	{#each crumbs as c, i (c.account)}
		{#if i > 0}<span class="sep">›</span>{/if}
		{#if c.isLast}
			<span class="crumb current">{c.label}</span>
		{:else}
			<a class="crumb" href={`${resolve('/finances/spending')}${query(c.account)}`}>{c.label}</a>
		{/if}
	{/each}
</nav>

<!-- Main view: monthly income vs expenses, stacked by category. Hover a segment
     for its source; click to filter the page down to that account. -->
{#if data.cashflow}
	<section class="card hero-card">
		<header class="cf-header">
			<h2><ArrowUpDown size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.sp_income_expenses}</h2>
			<nav class="section-tabs" aria-label={t.view_aria}>
				<button class="section" class:active={cfMode === 'split'} onclick={() => (cfMode = 'split')}>
					{t.sp_breakdown}
				</button>
				<button class="section" class:active={cfMode === 'total'} onclick={() => (cfMode = 'total')}>
					{t.net}
				</button>
			</nav>
		</header>
		<CashflowChart data={data.cashflow} mode={cfMode} onSelect={focusAccount} />
		{#if cfMode === 'split'}
			<p class="hint foot">{t.sp_click_segment}</p>
		{/if}
	</section>
{/if}

<!-- KPIs -->
<section class="kpis">
	<div class="kpi big">
		<span class="label">{kind} {t.sp_total_suffix}</span>
		<span class="figure">{money(disp(exp.total))}</span>
	</div>
	<div class="kpi">
		<span class="label">{t.sp_avg_per_month}</span>
		<span class="figure">{money(disp(exp.avg_per_month))}</span>
	</div>
	<div class="kpi">
		<span class="label">{t.bookings}</span>
		<span class="figure">{exp.count}</span>
	</div>
	<div class="kpi range">
		<span class="label">{t.period}</span>
		<span class="figure sm">{exp.from} – {exp.to}</span>
	</div>
</section>

<!-- Monthly trend -->
<section class="card">
	<h2><ChartColumn size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.sp_monthly_trend}</h2>
	{#key page.url.search}
		<FitnessChart type="bar" height="240px" data={trend} tooltipFormatter={(v: number) => money(v, true)} />
	{/key}
</section>

<div class="grid">
	<!-- Category breakdown (drill-down) -->
	{#if cats.length}
		<section class="card">
			<h2><Tags size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.sp_by_category}</h2>
			<ul class="bars">
				{#each cats as c (c.account)}
					{@const val = disp(c.amount) ?? 0}
					{@const pct = (val / catMax) * 100}
					{@const share = disp(exp.total) ? (val / (disp(exp.total) ?? 1)) * 100 : 0}
					<li>
						<a class="bar-row" href={accountHref(c.account)} title={t.view_account}>
							<span class="bar-name">{c.name}</span>
							<span class="bar-track"><span class="bar-fill" style="width: {pct}%"></span></span>
							<span class="bar-val">{money(val)}<small>{share.toFixed(0)}%</small></span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Top payees -->
	<section class="card">
		<h2><Store size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.sp_top_payees}</h2>
		{#if exp.by_payee.length}
			<ul class="bars">
				{#each exp.by_payee as p (p.payee)}
					{@const val = disp(p.amount) ?? 0}
					{@const pct = (val / payMax) * 100}
					<li>
						<a class="bar-row" href={payeeHref(p.payee)} title={t.sp_payee_txns}>
							<span class="bar-name">{p.payee} <small>×{p.count}</small></span>
							<span class="bar-track"><span class="bar-fill payee" style="width: {pct}%"></span></span>
							<span class="bar-val">{money(val)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{t.no_data}</p>
		{/if}
	</section>
</div>

<!-- Individual entries (drill-down) -->
<section class="card">
	<h2>
		<ReceiptText size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.bookings} {#if jrnl}<span class="count">({jrnl.total})</span>{/if}
		{#if data.payee}
			<a class="payee-chip" href={resolve('/finances/spending')} onclick={(e) => { e.preventDefault(); clearPayee(); }}>
				{data.payee} ✕
			</a>
		{/if}
	</h2>
	{#if jrnl && jrnl.transactions.length}
		<div class="table-scroll">
			<table class="fin-table">
				<thead>
					<tr><th class="hide-sm"></th><th>{t.date_col}</th><th>{t.payee_col}</th><th>{t.narration_col}</th><th class="r">{t.amount_col}</th></tr>
				</thead>
				<tbody>
					{#each jrnl.transactions as row, i (i)}
						<tr class="trow" onclick={() => (detail = row)} title={t.details_view}>
							<td class="flag hide-sm" title={row.postings.length > 2 ? `${row.postings.length} ${t.ac_postings_suffix}` : ''}>
								{row.postings.length > 2 ? '⑃' : ''}
							</td>
							<td class="date" data-label={t.date_col}>{row.date}</td>
							<td class="payee" class:hide-sm={!row.payee} data-label={t.payee_col}>
								{#if row.payee}
									<a href={payeeHref(row.payee)} onclick={(e) => { e.stopPropagation(); e.preventDefault(); findPayee(row.payee ?? ''); }}>{row.payee}</a>
								{/if}
							</td>
							<td class="narr" class:hide-sm={!row.narration} data-label={t.narration_col}>{row.narration ?? ''}</td>
							<td class="r num" data-label={t.amount_col}>{money(disp(row.amount_chf), true)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if jrnl.total > jrnl.transactions.length}
			<p class="muted more">{t.ac_showing_a}{jrnl.transactions.length}{t.ac_showing_mid}{jrnl.total}{t.ac_showing_b}</p>
		{/if}
	{:else}
		<p class="muted">{t.no_bookings}</p>
	{/if}
</section>

{#if detail}
	<TransactionDetail txn={detail} onClose={() => (detail = null)} onPayee={findPayee} />
{/if}

<style>
	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: var(--text-sm);
	}
	.crumb {
		color: var(--color-primary);
		text-decoration: none;
	}
	.crumb.current {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.sep {
		color: var(--color-text-tertiary);
	}

	.kpis {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: baseline;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.label {
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
	.figure.sm {
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
		margin-top: 2rem;
	}
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
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
	.hero-card {
		margin-bottom: 2rem;
	}
	.cf-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.cf-header h2 {
		margin: 0;
	}
	.section-tabs {
		display: flex;
		gap: 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.section {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.35rem 0.1rem;
		margin-bottom: -1px;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		border-bottom: 2px solid transparent;
		transition: color var(--transition-fast);
	}
	.section:hover {
		color: var(--color-text-primary);
	}
	.section.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}
	.hint {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.hint.foot {
		margin: 0.5rem 0 0;
		text-align: center;
	}
	.count {
		font-weight: 400;
		color: var(--color-text-tertiary);
		font-size: var(--text-base);
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.more {
		margin-top: 0.75rem;
	}

	.bars {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bar-row {
		display: grid;
		grid-template-columns: 9rem 1fr auto;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		padding: 0.25rem 0.4rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	a.bar-row:hover {
		background: var(--color-bg-elevated);
	}
	.bar-name {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a.bar-row .bar-name {
		color: var(--color-text-primary);
	}
	.bar-track {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		height: 0.55rem;
		overflow: hidden;
	}
	.bar-fill {
		display: block;
		height: 100%;
		background: var(--color-primary);
	}
	.bar-fill.payee {
		background: #ebcb8b;
	}
	.bar-val {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		white-space: nowrap;
	}
	.bar-val small {
		color: var(--color-text-tertiary);
		margin-left: 0.4rem;
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
	.date {
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.payee {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.payee a {
		color: inherit;
		text-decoration: none;
	}
	.payee a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.trow {
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.trow:hover {
		background: var(--color-bg-elevated);
	}
	.flag {
		color: var(--color-text-tertiary);
		text-align: center;
		width: 1.2rem;
	}
	.payee-chip {
		font-size: var(--text-sm);
		font-weight: 400;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: var(--radius-pill);
		padding: 0.15rem 0.6rem;
		margin-left: 0.5rem;
		text-decoration: none;
	}
	.payee-chip:hover {
		color: var(--color-text-primary);
	}
	.narr {
		color: var(--color-text-secondary);
	}

	@media (max-width: 700px) {
		.grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.bar-row {
			grid-template-columns: 6rem 1fr auto;
		}
		.kpi.big .figure {
			font-size: var(--text-2xl);
		}
	}
</style>
