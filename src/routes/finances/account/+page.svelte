<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import AccountTree from '$lib/components/finance/AccountTree.svelte';
	import { money } from '$lib/utils/finance';
	import type { BalanceSheet, TreeNode } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(m[financesLang(languageStore.value)]);

	// Each account name deep-links to its Fava-style account view.
	const accountHref = (a: string) => resolve('/finances/account/[account]', { account: a });

	// Valuation basis (market vs cost, default market — like Fava). Only the
	// balance sheet has a cost/market distinction; income & expenses are flows.
	// SSR data is at market; switching to cost refetches client-side.
	let basis = $state<'market' | 'cost'>('market');
	let bsOverride = $state<BalanceSheet | null>(null);
	let loading = $state(false);

	const bs = $derived(bsOverride ?? data.balanceSheet);
	const inc = $derived(data.income);

	const bsSection = (name: string): TreeNode | null =>
		bs.sections.find((s) => s.name === name) ?? null;
	const incSection = (name: string): TreeNode | null =>
		inc?.sections.find((s) => s.name === name) ?? null;

	const assets = $derived(bsSection('Assets'));
	const liabilities = $derived(bsSection('Liabilities'));
	const equity = $derived(bsSection('Equity'));
	const income = $derived(incSection('Income'));
	const expenses = $derived(incSection('Expenses'));

	// Assets = Liabilities + Equity check (their sign is already correct: assets
	// positive, liabilities negative). Shown as a small reconciliation figure.
	const liabEquity = $derived((liabilities?.value ?? 0) + (equity?.value ?? 0));

	async function fetchBasis() {
		loading = true;
		try {
			const q = new URLSearchParams({ basis });
			const to = page.url.searchParams.get('to');
			if (to) q.set('date', to);
			const res = await fetch(`/api/finances/balance-sheet?${q}`);
			if (res.ok) bsOverride = await res.json();
		} finally {
			loading = false;
		}
	}
	function setBasis(b: 'market' | 'cost') {
		if (b === basis) return;
		basis = b;
		if (b === 'market') bsOverride = null;
		else fetchBasis();
	}
	// Range/date changes reload SSR (market) data; refetch cost if that's active.
	afterNavigate(() => {
		bsOverride = null;
		if (basis === 'cost') fetchBasis();
	});
</script>

<svelte:head><title>{t.title_accounts}</title></svelte:head>

<!-- Income statement first: the date-range picker up top drives it, so keeping
     it adjacent makes that connection intuitive. -->
{#if inc}
	<header class="page-head">
		<h1>{t.income_statement}</h1>
		<span class="range fin-num">{inc.from} – {inc.to}</span>
	</header>
	<section class="sheet">
		<div class="side">
			<span class="side-label">{t.income}</span>
			{#if income}
				<div class="ledger"><AccountTree node={income} openDepth={99} hrefFor={accountHref} /></div>
			{/if}
		</div>
		<div class="side">
			<span class="side-label">{t.expenses}</span>
			{#if expenses}
				<div class="ledger"><AccountTree node={expenses} openDepth={99} hrefFor={accountHref} /></div>
			{/if}
		</div>
	</section>
{/if}

<header class="page-head second">
	<h1>{t.balance_sheet}</h1>
	<div class="basis" role="group" aria-label={t.valuation} class:loading>
		<button class:active={basis === 'market'} onclick={() => setBasis('market')} disabled={loading}>
			{t.market_value}
		</button>
		<button class:active={basis === 'cost'} onclick={() => setBasis('cost')} disabled={loading}>
			{t.cost_label}
		</button>
	</div>
</header>

<section class="sheet">
	<div class="side">
		<span class="side-label">{t.assets_label}</span>
		{#if assets}
			<div class="ledger"><AccountTree node={assets} openDepth={99} hrefFor={accountHref} /></div>
		{/if}
	</div>
	<div class="side">
		<span class="side-label">{t.liabilities_label}</span>
		{#if liabilities}
			<div class="ledger"><AccountTree node={liabilities} openDepth={99} hrefFor={accountHref} /></div>
		{/if}
		{#if equity}
			<div class="ledger"><AccountTree node={equity} openDepth={99} hrefFor={accountHref} /></div>
		{/if}
		<div class="subtotal fin-num">
			<span>{t.ac_li_total}</span><span>{money(liabEquity)}</span>
		</div>
	</div>
</section>

<style>
	.fin-num {
		font-family: var(--font-fin-num);
		font-variant-numeric: tabular-nums;
	}
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.page-head.second {
		margin-top: 2.5rem;
	}
	h1 {
		margin: 0;
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.range {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.basis {
		display: inline-flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
		transition: opacity var(--transition-fast);
	}
	.basis.loading {
		opacity: 0.6;
	}
	.basis button {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}
	.basis button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.sheet {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	.side-label {
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}
	.ledger {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 0.75rem 1rem;
		box-shadow: var(--shadow-sm);
	}
	.subtotal {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		border-top: 2px solid var(--color-border);
	}

	@media (max-width: 700px) {
		.sheet {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.page-head.second {
			margin-top: 1.5rem;
		}
	}
</style>
