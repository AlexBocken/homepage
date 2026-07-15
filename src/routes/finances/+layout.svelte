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
	import Tags from '@lucide/svelte/icons/tags';

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
	const categorize = resolve('/finances/categorize');
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
			<li style="--active-fill: var(--nord15)">
				<a href={categorize} class:active={page.url.pathname.startsWith(categorize)}>
					<Tags size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_categorize}</span>
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

	/* Responsive tables (opt-in via class="fin-table"). On phones each row reflows
	   into a stacked card: the header is dropped and every cell shows its column
	   name (from data-label) beside the value, so wide financial tables stay
	   readable without a horizontal scroll. A cell with NO data-label becomes the
	   card's title (e.g. a security name); mark decorative cells .hide-sm. Desktop
	   is untouched. Defined globally here so every finance page shares one rule. */
	@media (max-width: 600px) {
		/* Cards are full-width, so the horizontal scroller must not clip the
		   right-aligned values. */
		:global(.finances .table-scroll:has(.fin-table)) {
			overflow-x: visible;
		}
		:global(.finances .fin-table thead) {
			display: none;
		}
		:global(.finances .fin-table),
		:global(.finances .fin-table tbody),
		:global(.finances .fin-table tfoot),
		:global(.finances .fin-table tr),
		:global(.finances .fin-table td) {
			display: block;
			width: 100%;
		}
		:global(.finances .fin-table tr) {
			padding: 0.55rem 0.15rem;
			border-bottom: 1px solid var(--color-border);
		}
		:global(.finances .fin-table tr:last-child) {
			border-bottom: none;
		}
		:global(.finances .fin-table td) {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 1.5rem;
			padding: 0.18rem 0;
			border: none;
			text-align: right;
			white-space: normal;
		}
		:global(.finances .fin-table td)::before {
			content: attr(data-label);
			color: var(--color-text-secondary);
			font-weight: 500;
			text-align: left;
			white-space: nowrap;
		}
		/* Title cell: no data-label → left-aligned heading, no ::before label. */
		:global(.finances .fin-table td:not([data-label])) {
			justify-content: flex-start;
			gap: 0;
			text-align: left;
			font-weight: 600;
			padding-bottom: 0.3rem;
		}
		:global(.finances .fin-table td:not([data-label]))::before {
			content: none;
		}
		:global(.finances .fin-table td.hide-sm),
		:global(.finances .fin-table th.hide-sm) {
			display: none;
		}
		/* Drop cells with no value (e.g. an empty narration) so the card doesn't
		   show a dangling label. */
		:global(.finances .fin-table td:empty) {
			display: none;
		}
	}
</style>
