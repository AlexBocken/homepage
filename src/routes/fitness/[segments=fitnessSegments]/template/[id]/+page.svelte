<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Route from '@lucide/svelte/icons/route';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import ActivityIcon from '$lib/components/fitness/ActivityIcon.svelte';
	import { buildTrendChart } from '$lib/fitness/progressChart';
	import { formatElapsed, formatPaceKm, formatEffortRate } from '$lib/fitness/segmentFormat';
	import { sessionParam } from '$lib/fitness/prettyUrl';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const locale = $derived(lang === 'de' ? 'de-CH' : 'en-GB');
	const isCycling = $derived(data.activity === 'cycling');

	function fmtDate(d: string | Date) {
		return new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
	}
	function runHref(a: Attempt) {
		return resolve('/fitness/[history=fitnessHistory]/[id]', {
			history: s.history,
			id: sessionParam({ _id: a.sessionId, name: a.name, startTime: a.date }, lang)
		});
	}

	type Attempt = { sessionId: string; name: string; date: string; km: number; seconds: number; pace: number };

	// Chronological for the chart; most-recent-first for the table.
	const attempts = $derived([...(data.attempts ?? [])] as Attempt[]);
	const recent = $derived([...attempts].reverse());

	// Ranked on pace, not elapsed time: two runs of the same workout need not cover the
	// same distance, so the fastest one is the one with the best min/km.
	const best = $derived(
		attempts.length ? attempts.reduce((a, b) => (b.pace < a.pace ? b : a)) : null
	);
	const avgKm = $derived(
		attempts.length ? attempts.reduce((sum, a) => sum + a.km, 0) / attempts.length : 0
	);

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

	// Running trends on pace (min/km, lower is faster), cycling on speed (km/h, higher
	// is faster) — the same EMA trend and ±1σ band as the best-effort and segment pages.
	const chartData = $derived.by(() => {
		if (attempts.length < 2) return null;
		const pts = attempts.map((a) => ({
			date: a.date,
			value: isCycling ? (a.km / a.seconds) * 3600 : a.pace
		}));
		return buildTrendChart(pts, { label: isCycling ? t.speed : t.pace, color: primary, locale });
	});
	const chartTooltip = (v: number) => (isCycling ? `${v.toFixed(1)} km/h` : formatPaceKm(v));
</script>

<svelte:head>
	<title>{data.name} · {t.workout_progress}</title>
</svelte:head>

<div class="tpl-detail">
	<a class="back" href={resolve('/fitness/[segments=fitnessSegments]', { segments: s.segments })}>
		<ChevronLeft size={16} /> {t.segments}
	</a>

	<header>
		<h1><ActivityIcon activity={data.activity} size={20} /> {data.name}</h1>
		<span class="sub">{t.workout_progress}</span>
		{#if !data.exists}
			<span class="gone">{t.template_deleted}</span>
		{/if}
	</header>

	{#if best}
		<div class="stat-row">
			<span class="stat pr"><Trophy size={15} /> {formatEffortRate(best.km, best.seconds, isCycling ? 'cycling' : 'running')}</span>
			<span class="stat">{formatElapsed(best.seconds)} · {best.km.toFixed(2)} {t.km}</span>
			<span class="stat"><Route size={15} /> {t.typical_col}: {avgKm.toFixed(2)} {t.km}</span>
			<span class="stat muted"><Repeat size={14} /> {attempts.length} {t.attempts}</span>
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
					<span>{t.distance}</span>
					<span>{t.time_col}</span>
					<span>{isCycling ? t.speed : t.pace}</span>
				</div>
				{#each recent as a (a.sessionId)}
					{@const isBest = best != null && a.sessionId === best.sessionId}
					<a class="hist-row" class:best={isBest} href={runHref(a)} title={a.name}>
						<span class="date">{fmtDate(a.date)}</span>
						<span class="km">{a.km.toFixed(2)} {t.km}</span>
						<span class="time">{formatElapsed(a.seconds)}</span>
						<span class="rate">
							{formatEffortRate(a.km, a.seconds, isCycling ? 'cycling' : 'running')}
							{#if isBest}<span class="pb"> · {t.your_best}</span>{/if}
						</span>
					</a>
				{/each}
			</div>
		{/if}
		<p class="note">{t.workout_progress_hint}</p>
	</section>
</div>

<style>
	.tpl-detail {
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
	.sub {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		text-transform: lowercase;
	}
	.gone {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: var(--color-text-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.1rem 0.5rem;
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
	.note {
		margin: 0.6rem 0 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-text-tertiary);
	}
	.hist {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
	}
	.hist-head,
	.hist-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto auto;
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
	.km,
	.rate {
		color: var(--color-text-secondary);
		text-align: right;
	}
	.time {
		font-weight: 700;
		text-align: right;
	}
	.hist-row.best .rate {
		color: var(--color-primary);
	}
	.pb {
		color: var(--color-primary);
		font-weight: 600;
	}
	/* Tight screens: the date column carries the row, so let the distance go. */
	@media (max-width: 480px) {
		.hist-head span:nth-child(2),
		.hist-row .km {
			display: none;
		}
		.hist-head,
		.hist-row {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}
	}
</style>
