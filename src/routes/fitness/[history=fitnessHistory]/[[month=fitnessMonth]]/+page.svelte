<script>
	import { onMount, onDestroy, untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { page as appPage } from '$app/state';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import SessionCard from '$lib/components/fitness/SessionCard.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import ActivityIcon from '$lib/components/fitness/ActivityIcon.svelte';
	import BicepsFlexed from '@lucide/svelte/icons/biceps-flexed';
	import StretchIcon from '$lib/components/fitness/StretchIcon.svelte';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import { getExerciseById } from '$lib/data/exercises';
	import { getQueuedSessions, flushQueue } from '$lib/offline/fitnessQueue';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import CloudOff from '@lucide/svelte/icons/cloud-off';

	const lang = $derived(detectFitnessLang(appPage.url.pathname));
	const t = $derived(m[lang]);
	const locale = $derived(lang === 'de' ? 'de-DE' : 'en-US');

	let { data } = $props();

	const PAGE = untrack(() => data.pageSize ?? 20);
	const DUR_MAX = 300; // min
	const DIST_MAX = 80; // km
	const ACTIVITY_OPTS = $derived([
		{ key: 'running', label: t.act_running },
		{ key: 'walking', label: t.act_walking },
		{ key: 'cycling', label: t.act_cycling },
		{ key: 'hiking', label: t.act_hiking },
		{ key: 'strength', label: t.act_strength },
		{ key: 'stretching', label: t.act_stretching }
	]);

	// --- Server-paged list state ---
	let items = $state(untrack(() => data.initial ?? []));
	let total = $state(untrack(() => data.total ?? 0));
	let hasMore = $state(untrack(() => (data.initial?.length ?? 0) < (data.total ?? 0)));
	let loading = $state(false);

	// --- Filters ---
	let q = $state('');
	let durLow = $state(0);
	let durHigh = $state(DUR_MAX);
	let distLow = $state(0);
	let distHigh = $state(DIST_MAX);
	// key → 'in' (include) | 'out' (exclude). Absent = off. Cycles off→in→out→off.
	let activityState = new SvelteMap();
	let templateIds = new SvelteSet();
	let dateFrom = $state('');
	let dateTo = $state('');
	let exerciseId = $state('');
	let exerciseName = $state('');

	let showFilters = $state(false);
	let showPicker = $state(false);
	/** @type {Array<{ _id: string, name: string }>} */
	let templates = $state([]);

	const filtersActive = $derived(
		!!q.trim() ||
			durLow > 0 ||
			durHigh < DUR_MAX ||
			distLow > 0 ||
			distHigh < DIST_MAX ||
			activityState.size > 0 ||
			templateIds.size > 0 ||
			!!dateFrom ||
			!!dateTo ||
			!!exerciseId
	);
	const activeCount = $derived(
		(q.trim() ? 1 : 0) +
			(durLow > 0 || durHigh < DUR_MAX ? 1 : 0) +
			(distLow > 0 || distHigh < DIST_MAX ? 1 : 0) +
			activityState.size +
			templateIds.size +
			(dateFrom || dateTo ? 1 : 0) +
			(exerciseId ? 1 : 0)
	);

	/** @param {number} off */
	function buildParams(off) {
		const p = new URLSearchParams();
		p.set('limit', String(PAGE));
		p.set('offset', String(off));
		if (q.trim()) p.set('q', q.trim());
		if (durLow > 0) p.set('minDuration', String(durLow));
		if (durHigh < DUR_MAX) p.set('maxDuration', String(durHigh));
		if (distLow > 0) p.set('minDistance', String(distLow));
		if (distHigh < DIST_MAX) p.set('maxDistance', String(distHigh));
		for (const id of templateIds) p.append('templateId', id);
		if (dateFrom) p.set('from', dateFrom);
		if (dateTo) p.set('to', dateTo);
		if (exerciseId) p.set('exerciseId', exerciseId);
		for (const [key, st] of activityState) p.append(st === 'out' ? 'notActivityType' : 'activityType', key);
		return p.toString();
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		try {
			const res = await fetch(`/api/fitness/sessions?${buildParams(items.length)}`);
			const d = await res.json();
			const batch = d.sessions ?? [];
			items = [...items, ...batch];
			total = d.total ?? items.length;
			hasMore = batch.length > 0 && items.length < total;
		} catch {
			/* keep what we have */
		}
		loading = false;
	}

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let refilterTimer;
	async function refilter() {
		loading = true;
		try {
			const res = await fetch(`/api/fitness/sessions?${buildParams(0)}`);
			const d = await res.json();
			items = d.sessions ?? [];
			total = d.total ?? items.length;
			hasMore = items.length < total;
		} catch {
			/* keep what we have */
		}
		loading = false;
	}
	function scheduleRefilter() {
		clearTimeout(refilterTimer);
		refilterTimer = setTimeout(refilter, 300);
	}

	function resetFilters() {
		q = '';
		durLow = 0;
		durHigh = DUR_MAX;
		distLow = 0;
		distHigh = DIST_MAX;
		activityState.clear();
		templateIds.clear();
		dateFrom = '';
		dateTo = '';
		exerciseId = '';
		exerciseName = '';
		refilter();
	}

	/** @param {string} id */
	function toggleTemplate(id) {
		if (templateIds.has(id)) templateIds.delete(id);
		else templateIds.add(id);
		refilter();
	}

	/** Cycle a pill: off → include → exclude → off. @param {string} a */
	function cycleActivity(a) {
		const cur = activityState.get(a);
		if (!cur) activityState.set(a, 'in');
		else if (cur === 'in') activityState.set(a, 'out');
		else activityState.delete(a);
		refilter();
	}

	function pickedExercise(/** @type {string} */ id) {
		exerciseId = id;
		exerciseName = getExerciseById(id, lang)?.localName ?? id;
		showPicker = false;
		refilter();
	}

	// --- Offline-queued (unsynced) sessions, shown on top when unfiltered ---
	/** @type {any[]} */
	let queuedSessions = $state([]);
	async function loadQueued() {
		try {
			const entries = await getQueuedSessions();
			queuedSessions = entries.map((e) => {
				const d = /** @type {any} */ (e.data);
				const duration =
					d.startTime && d.endTime
						? Math.max(0, Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60000))
						: undefined;
				return /** @type {any} */ ({ ...d, _id: `queued-${e.id}`, duration });
			});
		} catch (err) {
			console.error('Failed to load queued workouts:', err);
		}
	}
	function onOnline() {
		setTimeout(async () => {
			await loadQueued();
			await refilter();
		}, 1500);
	}

	// Manual "sync now" — force a flush attempt for offline-queued sessions.
	let syncing = $state(false);
	let syncFailed = $state(false);
	async function forceSync() {
		if (syncing) return;
		syncing = true;
		syncFailed = false;
		const before = queuedSessions.length;
		try {
			const synced = await flushQueue();
			await loadQueued();
			// Refresh the server-paged list so newly-synced sessions appear as synced.
			await refilter();
			// Anything still queued and nothing synced means we're still offline / failing.
			if (synced === 0 && queuedSessions.length >= before && before > 0) syncFailed = true;
		} catch (err) {
			console.error('Force sync failed:', err);
			syncFailed = true;
		} finally {
			syncing = false;
		}
	}

	/** @type {HTMLElement | undefined} */
	let sentinel = $state();
	/** @type {IntersectionObserver | undefined} */
	let observer;

	onMount(() => {
		loadQueued();
		fetch('/api/fitness/templates')
			.then((r) => (r.ok ? r.json() : { templates: [] }))
			.then((d) => (templates = (d.templates ?? []).map((/** @type {any} */ x) => ({ _id: String(x._id), name: x.name }))))
			.catch(() => {});
		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: '400px' }
		);
		window.addEventListener('online', onOnline);
	});
	$effect(() => {
		const el = sentinel;
		if (el && observer) {
			observer.observe(el);
			return () => observer?.unobserve(el);
		}
	});
	onDestroy(() => {
		observer?.disconnect();
		if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
	});

	// Merge queued on top (only when unfiltered), newest first.
	const merged = $derived.by(() => {
		const base = filtersActive ? items : [...queuedSessions, ...items];
		return [...base].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
	});
	const queuedIds = $derived(new Set(queuedSessions.map((/** @type {any} */ x) => x._id)));

	/** @param {string} iso */
	function monthLabel(iso) {
		const d = new Date(iso);
		return `${d.toLocaleString(locale, { month: 'long' })} ${d.getFullYear()}`;
	}

	// Flatten into header + card rows, inserting a header when the month changes.
	const rows = $derived.by(() => {
		/** @type {Array<{ type: 'header', key: string } | { type: 'card', sess: any }>} */
		const out = [];
		let last = '';
		for (const sess of merged) {
			const key = monthLabel(sess.startTime);
			if (key !== last) {
				out.push({ type: 'header', key });
				last = key;
			}
			out.push({ type: 'card', sess });
		}
		return out;
	});
</script>

<svelte:head><title>{t.history_title} - Bocken</title></svelte:head>

<div class="history-page">
	<h1 class="sr-only">{t.history_title}</h1>

	<div class="search-row">
		<SearchInput bind:value={q} placeholder={t.search_workouts} oninput={scheduleRefilter} onClear={refilter} />
		<button class="filter-toggle" class:on={showFilters} onclick={() => (showFilters = !showFilters)}>
			<SlidersHorizontal size={16} />
			<span>{t.filters}</span>
			{#if activeCount > 0}<span class="badge">{activeCount}</span>{/if}
		</button>
	</div>

	{#if queuedSessions.length > 0}
		<div class="sync-banner" class:failed={syncFailed} transition:slide={{ duration: 150 }}>
			<CloudOff size={16} class="sync-banner-icon" />
			<span class="sync-banner-text">
				{#if syncFailed}
					{t.sync_failed}
				{:else if queuedSessions.length === 1}
					{t.unsynced_one}
				{:else}
					{t.unsynced_many.replace('{n}', String(queuedSessions.length))}
				{/if}
			</span>
			<button class="sync-now" onclick={forceSync} disabled={syncing}>
				<RefreshCw size={15} class={syncing ? 'spin' : ''} />
				<span>{syncing ? t.syncing : t.sync_now}</span>
			</button>
		</div>
	{/if}

	{#if showFilters}
		<div class="filter-panel" transition:slide={{ duration: 150 }}>
			<div class="filter-block">
				<RangeSlider label={t.filter_duration} min={0} max={DUR_MAX} step={5} bind:low={durLow} bind:high={durHigh}
					format={(v) => (v >= DUR_MAX ? `${DUR_MAX}+` : `${v}`)} oncommit={refilter} />
			</div>
			<div class="filter-block">
				<RangeSlider label={t.filter_distance} min={0} max={DIST_MAX} step={1} bind:low={distLow} bind:high={distHigh}
					format={(v) => (v >= DIST_MAX ? `${DIST_MAX}+` : `${v}`)} oncommit={refilter} />
			</div>

			<div class="filter-block">
				<span class="filter-label">{t.activity}</span>
				<div class="pills">
					{#each ACTIVITY_OPTS as a (a.key)}
						{@const st = activityState.get(a.key)}
						<button class="pill" class:on={st === 'in'} class:negated={st === 'out'} onclick={() => cycleActivity(a.key)}>
							{#if st === 'in'}<Plus size={13} />{:else if st === 'out'}<Minus size={13} />{/if}
							{#if a.key === 'strength'}<BicepsFlexed size={14} />{:else if a.key === 'stretching'}<StretchIcon size={14} />{:else}<ActivityIcon activity={a.key} size={14} />{/if}
							{a.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="filter-block">
				<span class="filter-label">{t.date}</span>
				<div class="date-range">
					<DatePicker bind:value={dateFrom} {lang} max={dateTo} onchange={refilter} />
					<span class="date-sep">–</span>
					<DatePicker bind:value={dateTo} {lang} min={dateFrom} onchange={refilter} />
				</div>
			</div>

			{#if templates.length > 0}
				<div class="filter-block">
					<span class="filter-label">{t.filter_template}</span>
					<div class="pills">
						{#each templates as tpl (tpl._id)}
							<button class="pill" class:on={templateIds.has(tpl._id)} onclick={() => toggleTemplate(tpl._id)}>{tpl.name}</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="filter-row">
				<div class="filter-block grow">
					<span class="filter-label">{t.filter_exercise}</span>
					{#if exerciseId}
						<button class="ex-chip" onclick={() => { exerciseId = ''; exerciseName = ''; refilter(); }}>
							{exerciseName} <X size={13} />
						</button>
					{:else}
						<button class="ex-pick" onclick={() => (showPicker = true)}>{t.pick_exercise}</button>
					{/if}
				</div>
			</div>

			{#if filtersActive}
				<button class="reset-btn" onclick={resetFilters}><X size={14} /> {t.reset_filters}</button>
			{/if}
		</div>
	{/if}

	{#if rows.length === 0}
		<p class="empty">{loading ? '' : filtersActive ? t.no_results : t.no_workouts_yet}</p>
	{:else}
		<div class="list">
			{#each rows as row (row.type === 'header' ? `h-${row.key}` : row.sess._id)}
				{#if row.type === 'header'}
					<h2 class="month-header">{row.key}</h2>
				{:else}
					<SessionCard session={row.sess} unsynced={queuedIds.has(row.sess._id)} />
				{/if}
			{/each}
		</div>
	{/if}

	<div class="sentinel" bind:this={sentinel}></div>
	{#if loading}
		<div class="loading"><Loader size={20} class="spin" /></div>
	{/if}
</div>

{#if showPicker}
	<ExercisePicker onSelect={pickedExercise} onClose={() => (showPicker = false)} />
{/if}

<style>
	.history-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.search-row {
		display: flex;
		gap: 0.6rem;
		align-items: center;
	}
	/* Tame the hero SearchInput for inline use (cospend layout) but with the
	   recipe-search colour styling: surface fill, no border, soft shadow. */
	.search-row :global(.search) {
		flex: 1;
		width: 100%;
		max-width: none;
		margin: 0;
		font-size: 1rem;
		filter: none;
	}
	.search-row :global(.search:hover),
	.search-row :global(.search:focus-within) {
		scale: 1;
		filter: none;
	}
	.search-row :global(input) {
		background: var(--color-surface);
		color: var(--color-text-primary);
		border: none;
		box-shadow: var(--shadow-sm);
		padding: 0.6rem 2rem 0.6rem 0.9rem;
	}
	.search-row :global(input::placeholder) {
		color: var(--color-text-secondary);
	}
	.search-row :global(.search-button) {
		color: var(--color-text-secondary);
	}
	.filter-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}
	.filter-toggle.on {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.filter-toggle .badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.1rem;
		height: 1.1rem;
		padding: 0 0.3rem;
		border-radius: 1000px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.7rem;
	}
	.filter-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.filter-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.filter-block {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.filter-block.grow {
		flex: 1;
		min-width: 160px;
	}
	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.date-range {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.date-sep {
		color: var(--color-text-secondary);
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: scale var(--transition-fast, 100ms);
	}
	.pill.on {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.pill.negated {
		background: color-mix(in srgb, var(--red) 15%, transparent);
		border-color: var(--red);
		color: var(--red);
		text-decoration: line-through;
	}
	.ex-pick,
	.ex-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.7rem;
		border-radius: var(--radius-md, 0.5rem);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.ex-pick {
		background: var(--color-bg-tertiary);
		border: 1px dashed var(--color-border);
		color: var(--color-text-secondary);
	}
	.ex-chip {
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
		border: 1px solid var(--color-primary);
		color: var(--color-primary);
	}
	.reset-btn {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: none;
		border: none;
		color: var(--red);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.month-header {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0.6rem 0 0;
	}
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 3rem 0;
	}
	.sentinel {
		height: 1px;
	}
	.loading {
		display: flex;
		justify-content: center;
		padding: 1rem 0;
		color: var(--color-text-secondary);
	}
	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.sync-banner {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.sync-banner.failed {
		border-color: var(--orange);
		color: var(--color-text-primary);
	}
	.sync-banner :global(.sync-banner-icon) {
		flex-shrink: 0;
		color: var(--color-text-tertiary);
	}
	.sync-banner.failed :global(.sync-banner-icon) {
		color: var(--orange);
	}
	.sync-banner-text {
		flex: 1;
		font-size: var(--text-sm);
		line-height: 1.3;
	}
	.sync-now {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
		padding: 0.45rem 0.8rem;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-normal), scale var(--transition-fast);
	}
	.sync-now:hover:not(:disabled) {
		background: var(--color-primary-hover);
		scale: 1.05;
	}
	.sync-now:disabled {
		opacity: 0.7;
		cursor: default;
	}
</style>
