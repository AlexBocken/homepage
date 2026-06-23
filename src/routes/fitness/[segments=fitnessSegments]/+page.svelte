<script lang="ts">
	import { page } from '$app/state';
	import { untrack, onMount } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatElapsed, formatPaceKm } from '$lib/fitness/segmentFormat';
	import Flag from '@lucide/svelte/icons/flag';
	import Radar from '@lucide/svelte/icons/radar';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import SegmentCard from '$lib/components/fitness/SegmentCard.svelte';
	import SegmentSuggestionCard from '$lib/components/fitness/SegmentSuggestionCard.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	interface Suggestion {
		routeHash: string;
		sessionId: string;
		exerciseIndex: number | null;
		startIdx: number;
		endIdx: number;
		points: number[][];
		distance: number;
		seenCount: number;
	}

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const me = $derived(page.data.session?.user?.nickname ?? '');
	const historySlug = $derived(lang === 'en' ? 'history' : 'verlauf');

	/** @type {{ km: number, seconds: number, pace: number, sessionId: string, name: string, date: string }[]} */
	const bestEfforts = $derived(data.bestEfforts ?? []);

	/** Age of an effort relative to today, localised ("3 days ago"). */
	function relativeAge(d: string) {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
		const rtf = new Intl.RelativeTimeFormat(lang === 'de' ? 'de' : 'en', { numeric: 'auto' });
		if (days < 1) return rtf.format(0, 'day');
		if (days < 30) return rtf.format(-days, 'day');
		if (days < 365) return rtf.format(-Math.floor(days / 30), 'month');
		return rtf.format(-Math.floor(days / 365), 'year');
	}

	let shareSegments = $state(untrack(() => data.shareSegments));
	async function toggleShare() {
		await fetch('/api/fitness/goal', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ shareSegments })
		});
	}

	let suggestions = $state<Suggestion[]>([]);
	async function loadSuggestions() {
		try {
			const res = await fetch('/api/fitness/segments/suggestions');
			if (res.ok) suggestions = (await res.json()).suggestions ?? [];
		} catch {
			/* non-fatal */
		}
	}
	onMount(loadSuggestions);

	const keyOf = (s: Suggestion) => `${s.sessionId}:${s.exerciseIndex}:${s.startIdx}:${s.endIdx}`;
	function dropSuggestion(s: Suggestion) {
		suggestions = suggestions.filter((x) => keyOf(x) !== keyOf(s));
	}
	async function onSuggestionAdded(s: Suggestion) {
		dropSuggestion(s);
		toast.success(t.create_segment);
		await invalidateAll();
	}

	let building = $state(false);
	async function buildIndex() {
		if (building) return;
		building = true;
		try {
			const res = await fetch('/api/fitness/segments/grid/rebuild', { method: 'POST' });
			const d = await res.json();
			if (res.ok) {
				toast.success(`${d.runs} ${t.route_index_runs} · ${d.popular} ${t.route_index_popular}`);
				await loadSuggestions();
			} else {
				toast.error(d.error ?? 'Failed');
			}
		} catch {
			toast.error('Failed');
		} finally {
			building = false;
		}
	}

	let tab = $state<'all' | 'mine'>('all');
	const shown = $derived(
		tab === 'mine' ? data.segments.filter((s) => s.createdBy === me) : data.segments
	);
</script>

<svelte:head>
	<title>{t.segments}</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

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
		<button class="build-index" onclick={buildIndex} disabled={building}>
			<Radar size={15} class={building ? 'spin' : ''} />
			{building ? t.building_route_index : t.build_route_index}
		</button>
	</div>

	{#if suggestions.length > 0}
		<section class="suggestions">
			<h2><Lightbulb size={18} /> {t.suggested_segments}</h2>
			<div class="grid">
				{#each suggestions as s (keyOf(s))}
					<SegmentSuggestionCard
						suggestion={s}
						{lang}
						onadded={() => onSuggestionAdded(s)}
						ondismiss={() => dropSuggestion(s)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	{#if shown.length === 0}
		<p class="empty">{t.no_segments}</p>
	{:else}
		<div class="grid">
			{#each shown as segment (segment._id)}
				<SegmentCard {segment} {lang} />
			{/each}
		</div>
	{/if}

	{#if bestEfforts.length > 0}
		<section class="best-efforts-all">
			<h2>{t.best_efforts}</h2>
			<table class="be-table">
				<thead>
					<tr>
						<th>{t.distance}</th>
						<th>TIME</th>
						<th>{t.pace}</th>
						<th>{t.age}</th>
					</tr>
				</thead>
				<tbody>
					{#each bestEfforts as e (e.km)}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<tr class="be-all-row" onclick={() => goto(resolve('/fitness/[history=fitnessHistory]/[id]', { history: historySlug, id: e.sessionId }))} title={e.name}>
							<td class="be-km">{e.km}{t.km_short}</td>
							<td class="be-time">{formatElapsed(e.seconds)}</td>
							<td class="be-pace">{formatPaceKm(e.pace)}</td>
							<td class="be-age">{relativeAge(e.date)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
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
	.build-index {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-primary);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.build-index:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.build-index:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.suggestions h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
		color: var(--color-primary);
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

	/* All-time best efforts table */
	.best-efforts-all {
		margin-top: 2rem;
	}
	.best-efforts-all h2 {
		font-size: 1.1rem;
		margin: 0 0 0.6rem;
	}
	.be-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		background: var(--color-surface);
		border-radius: var(--radius-md, 0.5rem);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}
	.be-table th {
		text-align: left;
		font-size: 0.68rem;
		letter-spacing: 0.05em;
		font-weight: 600;
		color: var(--color-text-secondary);
		padding: 0.5rem 0.8rem;
	}
	.be-table td {
		padding: 0.55rem 0.8rem;
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
	}
	.be-all-row {
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.be-all-row:hover {
		background: var(--color-bg-elevated);
	}
	.be-km {
		font-weight: 700;
		color: var(--color-primary);
	}
	.be-pace,
	.be-age {
		color: var(--color-text-secondary);
	}
	.be-age {
		text-align: right;
	}
	.be-table th:last-child {
		text-align: right;
	}
</style>
