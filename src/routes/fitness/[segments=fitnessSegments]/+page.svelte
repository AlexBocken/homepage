<script lang="ts">
	import { page } from '$app/state';
	import { untrack, onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatElapsed, formatEffortRate } from '$lib/fitness/segmentFormat';
	import { tableDistances, activityKindOf, type ActivityKind } from '$lib/fitness/bestEffortDistances';
	import Flag from '@lucide/svelte/icons/flag';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import SegmentCard from '$lib/components/fitness/SegmentCard.svelte';
	import SegmentSuggestionCard from '$lib/components/fitness/SegmentSuggestionCard.svelte';
	import ActivityIcon from '$lib/components/fitness/ActivityIcon.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

	interface Suggestion {
		routeHash: string;
		sessionId: string;
		exerciseIndex: number | null;
		startIdx: number;
		endIdx: number;
		points: number[][];
		distance: number;
		seenCount: number;
		activityType: string;
	}

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const me = $derived(page.data.session?.user?.nickname ?? '');

	let tab = $state<'all' | 'mine'>('all');
	let activity = $state<ActivityKind>('running');
	const scope = $derived(tab === 'mine' ? 'me' : 'all');

	// Best-efforts table data, cached per board+scope. The loader SSR-seeds the
	// running board for both scopes; cycling (and refreshes) load on demand.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let beCache = $state<Record<string, any[]>>(
		untrack(() => ({
			'running:me': data.bestEffortsMine ?? [],
			'running:all': data.bestEffortsAll ?? []
		}))
	);
	let beLoading = $state(false);
	async function loadBestEfforts(act: ActivityKind, sc: string) {
		const key = `${act}:${sc}`;
		if (beCache[key]) return;
		beLoading = true;
		try {
			const r = await fetch(`/api/fitness/stats/best-efforts?scope=${sc}&activity=${act}`);
			if (r.ok) beCache = { ...beCache, [key]: (await r.json()).efforts ?? [] };
		} catch {
			/* leave empty */
		} finally {
			beLoading = false;
		}
	}
	$effect(() => {
		loadBestEfforts(activity, scope);
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rawEfforts = $derived((beCache[`${activity}:${scope}`] ?? []) as any[]);
	// Trim cycling to milestone distances (running shows every km).
	const bestEfforts = $derived.by(() => {
		const allowed = new Set(tableDistances(activity, rawEfforts.map((e) => e.km)));
		return rawEfforts.filter((e) => allowed.has(e.km));
	});

	/** Per-distance progress page for the current activity board. */
	function bestEffortHref(km: number) {
		const seg = page.params.segments ?? 'segments';
		return resolve('/fitness/[segments=fitnessSegments]/[activity=fitnessActivity]/best/[km]', {
			segments: seg,
			activity,
			km: `${km}k`
		});
	}

	/** Age of an effort relative to today, localised ("3 days ago"). */
	function relativeAge(d: string) {
		// Calendar-day difference in local time (midnight to midnight), so a run
		// from yesterday evening reads "yesterday" rather than "today" just because
		// it's under 24 h ago. Math.round absorbs DST hour shifts.
		const then = new Date(d);
		const now = new Date();
		const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
		const days = Math.round((midnight(now) - midnight(then)) / 86400000);
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
	// Only suggest corridors for the board currently in view.
	const shownSuggestions = $derived(suggestions.filter((s) => activityKindOf(s.activityType) === activity));
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


	const shown = $derived(
		data.segments.filter(
			(s) =>
				(tab === 'mine' ? s.createdBy === me : true) && activityKindOf(s.activityType) === activity
		)
	);
</script>

<svelte:head>
	<title>{t.segments}</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="segments-page">
	<header>
		<h1><Flag size={22} /> {t.segments}</h1>
		<div class="tabs activity-tabs" role="group" aria-label={t.activity}>
			<button class:active={activity === 'running'} onclick={() => (activity = 'running')} aria-pressed={activity === 'running'} title={t.activity_running}>
				<ActivityIcon activity="running" size={16} /> <span class="tab-label">{t.activity_running}</span>
			</button>
			<button class:active={activity === 'cycling'} onclick={() => (activity = 'cycling')} aria-pressed={activity === 'cycling'} title={t.activity_cycling}>
				<ActivityIcon activity="cycling" size={16} /> <span class="tab-label">{t.activity_cycling}</span>
			</button>
		</div>
		<div class="tabs">
			<button class:active={tab === 'all'} onclick={() => (tab = 'all')}>{t.all_segments}</button>
			<button class:active={tab === 'mine'} onclick={() => (tab = 'mine')}>{t.my_segments}</button>
		</div>
	</header>

	<div class="opt-in">
		<Toggle bind:checked={shareSegments} label={t.share_segments} onchange={toggleShare} />
		<p class="opt-in-desc">{t.share_segments_desc}</p>
	</div>

	{#if shownSuggestions.length > 0}
		<section class="suggestions">
			<h2><Lightbulb size={18} /> {t.suggested_segments}</h2>
			<div class="grid">
				{#each shownSuggestions as s (keyOf(s))}
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
			<h2>{tab === 'mine' ? t.best_efforts : `${t.best_efforts} · ${t.all_segments}`}</h2>
			<div class="be-table" class:has-athlete={tab === 'all'}>
				<div class="be-head">
					<span>{t.distance}</span>
					<span>TIME</span>
					<span>{activity === 'cycling' ? t.speed : t.pace}</span>
					{#if tab === 'all'}<span class="be-athlete-col">{t.athlete}</span>{/if}
					<span class="be-age">{t.age}</span>
				</div>
				{#each bestEfforts as e (e.km)}
					<a class="be-row" href={bestEffortHref(e.km)} title={e.name}>
						<span class="be-km">{e.km}{t.km_short}</span>
						<span class="be-time">{formatElapsed(e.seconds)}</span>
						<span class="be-pace">{formatEffortRate(e.km, e.seconds, activity)}</span>
						{#if tab === 'all'}
							<span class="be-athlete">
								<span class="be-athlete-cell" class:me={e.mine} title={e.createdBy}>
									<ProfilePicture username={e.createdBy} size={22} />
									<span class="be-athlete-name">{e.createdBy}</span>
								</span>
							</span>
						{/if}
						<span class="be-age">{relativeAge(e.date)}</span>
					</a>
				{/each}
			</div>
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
	.activity-tabs button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	/* Header wraps on narrow screens; let the activity switch sit in the middle. */
	header {
		row-gap: 0.5rem;
	}
	/* Collapse the activity switch to icons early so it and the All/Mine tabs
	   stay on one line as long as possible before the header wraps. */
	@media (max-width: 720px) {
		.activity-tabs .tab-label {
			display: none;
		}
	}
	/* Tighten the title and tabs on narrow screens so the row wraps later. */
	@media (max-width: 600px) {
		header {
			gap: 0.5rem;
		}
		h1 {
			font-size: 1.2rem;
		}
		.tabs button {
			padding: 0.4rem 0.7rem;
			font-size: 0.8rem;
		}
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
		font-size: 0.85rem;
		background: var(--color-surface);
		border-radius: var(--radius-md, 0.5rem);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
	}
	.be-head,
	.be-row {
		display: grid;
		grid-template-columns: auto auto auto minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		padding: 0.55rem 0.8rem;
	}
	.be-table.has-athlete .be-head,
	.be-table.has-athlete .be-row {
		grid-template-columns: auto auto auto minmax(0, 1fr) auto;
	}
	.be-head {
		font-size: 0.68rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--color-text-secondary);
		padding-bottom: 0.5rem;
	}
	.be-row {
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.be-row:hover {
		background: var(--color-bg-elevated);
	}
	.be-athlete {
		min-width: 0;
	}
	.be-athlete-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}
	.be-athlete-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 12ch;
	}
	.be-athlete-cell.me .be-athlete-name {
		font-weight: 700;
		color: var(--color-primary);
	}
	/* Tight screens: collapse the athlete column to just the avatar. */
	@media (max-width: 560px) {
		.be-athlete-name {
			display: none;
		}
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
		justify-self: end;
	}
</style>
