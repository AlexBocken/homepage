<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import AccountChart from '$lib/components/finance/AccountChart.svelte';
	import TransactionDetail from '$lib/components/finance/TransactionDetail.svelte';
	import { money } from '$lib/utils/finance';
	import type { AccountJournalTxn, AccountView } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const v: AccountView = $derived(data.view);
	const t = $derived(m[financesLang(languageStore.value)]);

	let mode = $state<'changes' | 'balance'>('changes');
	let detail = $state<AccountJournalTxn | null>(null);
	const chartKey = $derived(page.url.search);

	const accountHref = (a: string) => resolve('/finances/account/[account]', { account: a });
	function goAccount(a: string) {
		detail = null;
		goto(accountHref(a));
	}
	function findPayee(p: string) {
		detail = null;
		goto(`${resolve('/finances/spending')}?payee=${encodeURIComponent(p)}`);
	}

	// Breadcrumb of account ancestors.
	const crumbs = $derived.by(() => {
		const segs = v.account.split(':');
		let acc = '';
		return segs.map((seg, i) => {
			acc = i === 0 ? seg : `${acc}:${seg}`;
			return { label: seg, account: acc, isLast: i === segs.length - 1 };
		});
	});
</script>

<svelte:head><title>{v.account}</title></svelte:head>

<nav class="crumbs" aria-label={t.account_label}>
	{#each crumbs as c, i (c.account)}
		{#if i > 0}<span class="sep">›</span>{/if}
		{#if c.isLast}<span class="crumb current fin-num">{c.label}</span>
		{:else}<a class="crumb fin-num" href={accountHref(c.account)}>{c.label}</a>{/if}
	{/each}
</nav>

<section class="head">
	<div>
		<span class="label">{t.balance}</span>
		<span class="balance fin-num" style="color: {(v.balance ?? 0) < 0 ? 'var(--red)' : 'var(--color-text-primary)'}">{money(v.balance)}</span>
	</div>
	<div class="modes" role="group" aria-label={t.chart_aria}>
		<button class:active={mode === 'changes'} onclick={() => (mode = 'changes')}>{t.ac_changes}</button>
		<button class:active={mode === 'balance'} onclick={() => (mode = 'balance')}>{t.ac_balance}</button>
	</div>
</section>

<section class="card">
	{#key chartKey}
		<AccountChart
			{mode}
			months={v.months}
			children={v.children}
			balanceSeries={v.balance_series}
			onSelect={goAccount}
		/>
	{/key}
	{#if mode === 'changes' && v.children.length > 1}
		<div class="legend">
			{#each v.children.slice(0, 12) as c, i (c.account)}
				<a class="leg" href={accountHref(c.account)}>
					<span class="dot" style="background: {['#d08770','#a3be8c','#ebcb8b','#b48ead','#bf616a','#8fbcbb','#b76b54','#86a56e','#d9b266','#997491','#a34e56','#6fa2a1'][i % 12]}"></span>
					{c.name}
				</a>
			{/each}
		</div>
	{/if}
</section>

<section class="card">
	<h2><ReceiptText size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.ac_journal} <span class="count">({v.count})</span></h2>
	<div class="table-scroll">
		<table class="fin-table">
			<thead>
				<tr><th class="hide-sm"></th><th>{t.date_col}</th><th>{t.ac_payee_narration}</th><th class="r">{t.ac_change}</th><th class="r">{t.balance}</th></tr>
			</thead>
			<tbody>
				{#each v.journal as row, i (i)}
					<tr class="trow" onclick={() => (detail = row)} title={t.details_view}>
						<td class="flag hide-sm" title={row.postings.length > 2 ? `${row.postings.length} ${t.ac_postings_suffix}` : ''}>{row.postings.length > 2 ? '⑃' : ''}</td>
						<td class="date fin-num" data-label={t.date_col}>{row.date}</td>
						<td class="pn" data-label={t.ac_payee_narration}>
							{#if row.payee}<a class="payee" href={`${resolve('/finances/spending')}?payee=${encodeURIComponent(row.payee)}`} onclick={(e) => { e.stopPropagation(); e.preventDefault(); findPayee(row.payee ?? ''); }}>{row.payee}</a>{/if}
							{#if row.narration}<span class="narr">{row.payee ? ' · ' : ''}{row.narration}</span>{/if}
						</td>
						<td class="r num fin-num" data-label={t.ac_change}>{money(row.change, true)}</td>
						<td class="r num fin-num bal" data-label={t.balance}>{money(row.balance, true)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if v.count > v.journal.length}
		<p class="muted more">{t.ac_showing_a}{v.journal.length}{t.ac_showing_mid}{v.count}{t.ac_showing_b}</p>
	{/if}
</section>

{#if detail}
	<TransactionDetail txn={detail} onClose={() => (detail = null)} onPayee={findPayee} onAccount={goAccount} />
{/if}

<style>
	.fin-num {
		font-family: var(--font-fin-num);
		font-variant-numeric: tabular-nums;
	}
	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
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

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		display: block;
	}
	.balance {
		font-size: var(--text-2xl);
		font-weight: 600;
	}
	.modes {
		display: inline-flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
	}
	.modes button {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}
	.modes button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
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
	.count {
		font-weight: 400;
		color: var(--color-text-tertiary);
		font-size: var(--text-base);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.leg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.leg:hover {
		color: var(--color-text-primary);
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 3px;
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
		padding: 0.4rem 0.5rem;
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
		white-space: nowrap;
	}
	.bal {
		color: var(--color-text-secondary);
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
	.date {
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}
	.payee {
		color: var(--color-text-primary);
		font-weight: 500;
		text-decoration: none;
	}
	.payee:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.narr {
		color: var(--color-text-secondary);
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.more {
		margin-top: 0.75rem;
	}
</style>
