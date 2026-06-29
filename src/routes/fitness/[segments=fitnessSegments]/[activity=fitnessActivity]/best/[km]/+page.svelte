<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { buildTrendChart } from '$lib/fitness/progressChart';
	import { formatElapsed, formatPaceKm, formatEffortRate, formatDelta } from '$lib/fitness/segmentFormat';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const locale = $derived(lang === 'de' ? 'de-CH' : 'en-GB');
	const isCycling = $derived(data.activity === 'cycling');

	function fmtDate(d: string | Date) {
		return new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
	}
	// Link to the run this split was set in, pre-pinning the distance on its map.
	function runHref(sessionId: string) {
		return `${resolve('/fitness/[history=fitnessHistory]/[id]', { history: s.history, id: sessionId })}?highlight=${data.km}k`;
	}

	type Attempt = { sessionId: string; name: string; date: string; seconds: number; pace: number };

	// Chronological for the chart; most-recent-first for the table.
	const history = $derived(
		[...(data.history ?? [])].sort(
			(a: Attempt, b: Attempt) => new Date(a.date).getTime() - new Date(b.date).getTime()
		) as Attempt[]
	);
	const recent = $derived([...history].reverse());
	const prSeconds = $derived(history.length ? Math.min(...history.map((h) => h.seconds)) : null);

	// Theme-reactive trend colour (charts can't read CSS vars; recolour on toggle).
	function checkDark() {
		if (typeof document === 'undefined') return false;
		const th = document.documentElement.dataset.theme;
		if (th === 'dark') return true;
		if (th === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}
	let dark = $state(checkDark());
	onMount(() => {
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onMql = () => { dark = checkDark(); };
		mql.addEventListener('change', onMql);
		const obs = new MutationObserver(() => { dark = checkDark(); });
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => { mql.removeEventListener('change', onMql); obs.disconnect(); };
	});
	const primary = $derived(dark ? '#88C0D0' : '#5E81AC');

	// Running boards trend on pace (min/km, lower is faster); cycling boards on
	// speed (km/h, higher is faster). Same EMA trend + ±1σ band as the other
	// fitness progress charts.
	const chartData = $derived.by(() => {
		if (history.length < 2) return null;
		const pts = history.map((h) => ({
			date: h.date,
			value: isCycling ? (data.km / h.seconds) * 3600 : h.pace
		}));
		return buildTrendChart(pts, { label: isCycling ? t.speed : t.pace, color: primary, locale });
	});
	const chartTooltip = (v: number) => (isCycling ? `${v.toFixed(1)} km/h` : formatPaceKm(v));
</script>

<svelte:head>
	<title>{data.km}{t.km_short} · {t.best_efforts}</title>
</svelte:head>

<div class="be-detail">
	<a class="back" href={resolve('/fitness/[segments=fitnessSegments]', { segments: s.segments })}>
		<ChevronLeft size={16} /> {t.segments}
	</a>

	<header>
		<h1><Trophy size={20} /> {data.km}{t.km_short} {isCycling ? t.activity_cycling : t.activity_running}</h1>
		<span class="sub">{t.best_efforts}</span>
	</header>

	{#if prSeconds != null}
		<div class="stat-row">
			<span class="stat pr"><Trophy size={15} /> {formatElapsed(prSeconds)}</span>
			<span class="stat">{formatEffortRate(data.km, prSeconds, isCycling ? 'cycling' : 'running')}</span>
			<span class="stat muted">{history.length} {t.attempts}</span>
		</div>
	{/if}

	{#if chartData}
		<section class="chart-section">
			<h2><TrendingUp size={17} /> {isCycling ? t.speed_progress : t.pace_progress}</h2>
			<FitnessChart data={chartData} height="260px" tooltipFormatter={chartTooltip} />
			<p class="chart-hint">{isCycling ? t.higher_is_faster : t.lower_is_faster}</p>
		</section>
	{/if}

	<section class="mine">
		<h2>{t.effort_history}</h2>
		{#if recent.length === 0}
			<p class="empty">{t.no_efforts}</p>
		{:else}
			<div class="hist">
				<div class="hist-head">
					<span>{t.date_col}</span>
					<span>{t.time_col}</span>
					<span>{isCycling ? t.speed : t.pace}</span>
				</div>
				{#each recent as a (a.sessionId)}
					{@const isBest = prSeconds != null && a.seconds === prSeconds}
					<a class="hist-row" class:best={isBest} href={runHref(a.sessionId)} title={a.name}>
						<span class="date">{fmtDate(a.date)}</span>
						<span class="time" class:delta={!isBest}>
							{#if isBest}{formatElapsed(a.seconds)}<span class="pb"> · {t.your_best}</span>
							{:else}{formatDelta(a.seconds - (prSeconds ?? a.seconds))}{/if}
						</span>
						<span class="rate">{formatEffortRate(data.km, a.seconds, isCycling ? 'cycling' : 'running')}</span>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.be-detail {
		max-width: 900px;
		margin-inline: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-decoration: none;
		width: fit-content;
	}
	.back:hover {
		color: var(--color-primary);
	}
	header {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0;
		font-size: 1.5rem;
	}
	h1 :global(svg) {
		color: var(--color-amber-text);
	}
	.sub {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		text-transform: lowercase;
	}
	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.stat.pr {
		font-size: 1.15rem;
		color: var(--color-text-primary);
	}
	.stat.pr :global(svg) {
		color: var(--color-amber-text);
	}
	.stat.muted {
		font-weight: 400;
		font-size: 0.82rem;
	}
	section {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
	}
	.chart-hint {
		margin: 0.4rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-align: right;
	}
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
	.hist {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
	}
	.hist-head,
	.hist-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.45rem 0.5rem;
	}
	.hist-head {
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
		padding-bottom: 0.3rem;
	}
	.hist-row {
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.hist-row:hover {
		background: var(--color-bg-elevated);
	}
	.date {
		color: var(--color-primary);
		font-weight: 600;
	}
	.time {
		font-weight: 700;
		text-align: right;
	}
	.time.delta {
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.rate {
		text-align: right;
		color: var(--color-text-secondary);
	}
	.hist-row.best .time {
		color: var(--color-primary);
	}
	.pb {
		color: var(--color-primary);
		font-weight: 600;
	}
</style>
