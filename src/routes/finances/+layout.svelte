<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import FinanceRangePicker from '$lib/components/finance/FinanceRangePicker.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Receipt from '@lucide/svelte/icons/receipt';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Target from '@lucide/svelte/icons/target';
	import Terminal from '@lucide/svelte/icons/terminal';
	import FolderTree from '@lucide/svelte/icons/folder-tree';

	let { data, children } = $props();
	const user = $derived(data.session?.user);

	// Language is the site-wide client preference (URLs stay English); nav labels
	// and every page read `t` reactively off the store.
	const lang = $derived(financesLang(languageStore.value));
	const t = $derived(m[lang]);

	const overview = resolve('/finances');
	const spending = resolve('/finances/spending');
	const investments = resolve('/finances/investments');
	const budget = resolve('/finances/budget');
	const accounts = resolve('/finances/account');
	const queryPage = resolve('/finances/query');
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li style="--active-fill: var(--nord8)">
				<a href={overview} class:active={page.url.pathname === overview}>
					<Wallet size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_overview}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord12)">
				<a href={spending} class:active={page.url.pathname.startsWith(spending)}>
					<Receipt size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_spending}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord14)">
				<a href={investments} class:active={page.url.pathname.startsWith(investments)}>
					<TrendingUp size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_investments}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord13)">
				<a href={budget} class:active={page.url.pathname.startsWith(budget)}>
					<Target size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_budget}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord9)">
				<a href={accounts} class:active={page.url.pathname.startsWith(accounts)}>
					<FolderTree size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_accounts}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord7)">
				<a href={queryPage} class:active={page.url.pathname.startsWith(queryPage)}>
					<Terminal size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_query}</span>
				</a>
			</li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={financesLang(languageStore.value)} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={financesLang(languageStore.value)} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} />
	{/snippet}

	<div class="finances">
		{#if data.dateRange}
			<FinanceRangePicker min={data.dateRange.from} max={data.dateRange.to} />
		{/if}
		{@render children()}
	</div>
</Header>

<style>
	.finances {
		/* Scoped monospace for tabular figures — plain-text-accounting nod; makes
		   decimals + thousands align like a printed ledger. Apply via .fin-num. */
		--font-fin-num: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Menlo',
			monospace;
		max-width: 1200px;
		margin-inline: auto;
		padding: 1.5rem 1rem 4rem;
	}
</style>
