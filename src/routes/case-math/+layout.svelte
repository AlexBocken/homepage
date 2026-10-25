<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import Calculator from '@lucide/svelte/icons/calculator';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChartLine from '@lucide/svelte/icons/chart-line';

	let { data, children } = $props();
	const user = $derived(data.session?.user);

	const today = resolve('/case-math');
	const learn = resolve('/case-math/learn');
	const progress = resolve('/case-math/progress');
	const onToday = $derived(
		page.url.pathname === today || page.url.pathname.startsWith(`${today}/daily`) || page.url.pathname.startsWith(`${today}/drill`)
	);
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li style="--active-fill: var(--nord8)">
				<a href={today} class:active={onToday}>
					<Calculator size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Practice</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord13)">
				<a href={learn} class:active={page.url.pathname.startsWith(learn)}>
					<BookOpen size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Rules of thumb</span>
				</a>
			</li>
			<li style="--active-fill: var(--nord14)">
				<a href={progress} class:active={page.url.pathname.startsWith(progress)}>
					<ChartLine size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Progress</span>
				</a>
			</li>
		</ul>
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} />
	{/snippet}

	<div class="case-math">
		{@render children()}
	</div>
</Header>

<style>
	.case-math {
		/* Figures line up in columns and don't jitter while the clock runs. */
		font-variant-numeric: tabular-nums;
		max-width: 1000px;
		margin-inline: auto;
		padding: 1.5rem 1rem 4rem;
	}
</style>
