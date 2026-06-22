<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Flag from '@lucide/svelte/icons/flag';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import SegmentCard from '$lib/components/fitness/SegmentCard.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const me = $derived(page.data.session?.user?.nickname ?? '');

	let shareSegments = $state(untrack(() => data.shareSegments));
	async function toggleShare() {
		await fetch('/api/fitness/goal', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ shareSegments })
		});
	}

	let tab = $state<'all' | 'mine'>('all');
	const shown = $derived(
		tab === 'mine' ? data.segments.filter((s) => s.createdBy === me) : data.segments
	);
</script>

<svelte:head><title>{t.segments}</title></svelte:head>

<div class="segments-page">
	<header>
		<h1><Flag size={22} /> {t.segments}</h1>
		<div class="tabs">
			<button class:active={tab === 'all'} onclick={() => (tab = 'all')}>{t.all_segments}</button>
			<button class:active={tab === 'mine'} onclick={() => (tab = 'mine')}>{t.my_segments}</button>
		</div>
	</header>

	<div class="opt-in">
		<Toggle bind:checked={shareSegments} label={t.share_segments} onchange={toggleShare} />
		<p class="opt-in-desc">{t.share_segments_desc}</p>
	</div>

	{#if shown.length === 0}
		<p class="empty">{t.no_segments}</p>
	{:else}
		<div class="grid">
			{#each shown as segment (segment._id)}
				<SegmentCard {segment} {lang} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.segments-page {
		max-width: 1000px;
		margin-inline: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.5rem;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill, 1000px);
		padding: 0.2rem;
	}
	.tabs button {
		border: none;
		background: none;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill, 1000px);
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		transition: background var(--transition-fast, 100ms);
	}
	.tabs button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.opt-in {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.opt-in-desc {
		margin: 0;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.empty {
		color: var(--color-text-secondary);
		text-align: center;
		padding: 2rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
	}
	@media (max-width: 560px) {
		.grid {
			gap: 0.5rem;
		}
	}
</style>
