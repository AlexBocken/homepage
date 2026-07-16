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
	import Target from '@lucide/svelte/icons/target';
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
					<span class="nav-icon-wrap nav-icon-wallet"><Wallet size={16} strokeWidth={1.5} class="nav-icon" /></span><span class="nav-label">{t.nav_overview}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord12)">
				<a href={spending} class:active={page.url.pathname.startsWith(spending)}>
					<svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="fill" d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" /><path d="M12 17V7" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" /></svg><span class="nav-label">{t.nav_spending}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord14)">
				<a href={investments} class:active={page.url.pathname.startsWith(investments)}>
					<svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="hl" d="M16 7h6v6" /><path class="hl" d="m22 7-8.5 8.5-5-5L2 17" /></svg><span class="nav-label">{t.nav_investments}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord13)">
				<a href={budget} class:active={page.url.pathname.startsWith(budget)}>
					<Target size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{t.nav_budget}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord9)">
				<a href={accounts} class:active={page.url.pathname.startsWith(accounts)}>
					<svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="fill" d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" /><path class="fill" d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" /><path d="M3 5a2 2 0 0 0 2 2h3" /><path d="M3 3v13a2 2 0 0 0 2 2h3" /></svg><span class="nav-label">{t.nav_accounts}</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord7)">
				<a href={queryPage} class:active={page.url.pathname.startsWith(queryPage)}>
					<svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="hl" d="M12 19h8" /><path class="hl" d="m4 17 6-6-6-6" /></svg><span class="nav-label">{t.nav_query}</span>
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
	/* Seven links with labels this long outgrow the pill well before the header's
	   own 800px label breakpoint, so drop to icons only earlier here. */
	@media screen and (max-width: 900px) {
		.site_header .nav-label {
			display: none;
		}
		.site_header li > a {
			padding: 0.4rem;
		}
	}

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
