<script lang="ts">
	import { page } from '$app/state';
	import { createDarkMode } from '$lib/js/darkMode.svelte';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import EffortHistoryTable from '$lib/components/fitness/EffortHistoryTable.svelte';
	import TrendChartSection from '$lib/components/fitness/TrendChartSection.svelte';
	import { buildTrendChart } from '$lib/fitness/progressChart';
	import { formatElapsed, formatPaceKm, formatEffortRate, formatDelta, formatSegmentDate, segmentLocale } from '$lib/fitness/segmentFormat';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const locale = $derived(segmentLocale(lang));
	const isCycling = $derived(data.activity === 'cycling');

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
	const darkMode = createDarkMode();
	const dark = $derived(darkMode.dark);

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
		<TrendChartSection
			title={isCycling ? t.speed_progress : t.pace_progress}
			data={chartData}
			height="260px"
			tooltipFormatter={chartTooltip}
			hint={isCycling ? t.higher_is_faster : t.lower_is_faster}
		/>
	{/if}

	<section class="mine">
		<h2>{t.effort_history}</h2>
		{#if recent.length === 0}
			<p class="empty">{t.no_efforts}</p>
		{:else}
			<EffortHistoryTable
				rows={recent}
				key={(a) => a.sessionId}
				href={(a) => runHref(a.sessionId)}
				title={(a) => a.name}
				isBest={(a) => prSeconds != null && a.seconds === prSeconds}
			>
				{#snippet head()}
					<span>{t.date_col}</span>
					<span>{t.time_col}</span>
					<span>{isCycling ? t.speed : t.pace}</span>
				{/snippet}
				{#snippet row(a, isBest)}
					<span class="date">{formatSegmentDate(a.date, locale)}</span>
					<span class="time" class:delta={!isBest}>
						{#if isBest}{formatElapsed(a.seconds)}<span class="pb"> · {t.your_best}</span>
						{:else}{formatDelta(a.seconds - (prSeconds ?? a.seconds))}{/if}
					</span>
					<span class="rate">{formatEffortRate(data.km, a.seconds, isCycling ? 'cycling' : 'running')}</span>
				{/snippet}
			</EffortHistoryTable>
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
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
	.mine :global(.hist-head),
	.mine :global(.hist-row) {
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 0.75rem;
		padding: 0.45rem 0.5rem;
	}
	.mine :global(.hist-head) {
		padding-bottom: 0.3rem;
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
	:global(.hist-row.best) .time {
		color: var(--color-primary);
	}
	.pb {
		color: var(--color-primary);
		font-weight: 600;
	}
</style>
