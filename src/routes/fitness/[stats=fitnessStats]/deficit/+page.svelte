<script>
	import { page } from '$app/state';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ActivityGrid from '$lib/components/fitness/ActivityGrid.svelte';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { createZoomRange, enumerateDays, trailingDaysRange } from '$lib/fitness/chartRange.svelte';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const isEn = $derived(lang === 'en');

	// Match the balance card: surplus (eating over) green, deficit (under) red.
	const GREEN = '#A3BE8C';
	const RED = '#BF616A';

	const balance = $derived(data.balance ?? { series: [], hasTdee: false, start: '', end: '' });
	/** @type {Record<string, any>} */
	const byDate = $derived(Object.fromEntries((balance.series ?? []).map((/** @type {any} */ d) => [d.date, d])));

	// Only days where expenditure could be estimated carry a balance.
	const balanceDays = $derived((balance.series ?? []).filter((/** @type {any} */ d) => d.balance != null));

	// The bars start at the first logged day — leading untracked days are a blank
	// run-up with nothing to plot. The grid below keeps the full window instead, so
	// an empty stretch still reads as "not logged" rather than as history that never
	// existed.
	const chartStart = $derived(balance.series?.length ? balance.series[0].date : balance.start);

	const avg7 = $derived.by(() => {
		const recent = balanceDays.slice(-7);
		if (!recent.length) return null;
		return Math.round(recent.reduce((/** @type {number} */ s, /** @type {any} */ d) => s + d.balance, 0) / recent.length);
	});

	// Scale for the grid colour intensity.
	const niceMax = $derived(Math.ceil(Math.max(250, ...balanceDays.map((/** @type {any} */ d) => Math.abs(d.balance))) / 250) * 250);

	// Every calendar day in the window, gaps included: a day with no logged balance
	// is a null (empty column), not a skipped one, so the spacing stays calendar-true.
	const allDates = $derived(enumerateDays(chartStart, balance.end));

	// The chart carries the whole window on a time axis, but opens on the last month:
	// a year of daily bars is a few pixels each, too thin to read a day off. Panning
	// or pinching reaches the rest, same gestures as the body-trend charts.
	const DEFAULT_DAYS = 30;

	const balanceChart = $derived({
		dates: allDates,
		datasets: [{
			label: isEn ? 'Balance' : 'Bilanz',
			// null for unlogged / non-estimable days → Chart.js leaves a gap.
			data: allDates.map((/** @type {string} */ d) => byDate[d]?.balance ?? null),
			backgroundColor: allDates.map((/** @type {string} */ d) => {
				const b = byDate[d]?.balance;
				return b == null ? 'transparent' : (b > 0 ? GREEN : RED);
			}),
		}],
	});


	// The window the chart opens on, and the one the reset button returns to.
	const defaultRange = $derived(trailingDaysRange(allDates, DEFAULT_DAYS));

	// A user gesture takes over from the default; resetting hands it back.
	const zoom = createZoomRange(() => defaultRange);

	/** Diverging colour matching the balance card: surplus green, deficit red. */
	/** @param {any} day */
	function colorOf(day) {
		if (!day) return 'var(--color-bg-tertiary)';
		if (day.balance == null) return 'color-mix(in srgb, var(--blue) 25%, var(--color-bg-tertiary))';
		const intensity = Math.min(1, Math.abs(day.balance) / niceMax);
		const pct = Math.round(20 + intensity * 80);
		const base = day.balance > 0 ? 'var(--green)' : 'var(--red)';
		return `color-mix(in srgb, ${base} ${pct}%, var(--color-bg-tertiary))`;
	}
	/** @param {any} day @param {string} date */
	function labelOf(day, date) {
		if (!day) return `${date} · ${isEn ? 'not logged' : 'nicht erfasst'}`;
		if (day.balance == null) return `${date} · ${day.calories} kcal · ${isEn ? 'no expenditure estimate' : 'kein Verbrauchswert'}`;
		const sign = day.balance > 0 ? '+' : '';
		const word = day.balance > 0 ? (isEn ? 'surplus' : 'Überschuss') : (isEn ? 'deficit' : 'Defizit');
		return `${date} · ${sign}${day.balance} kcal ${word} (${day.calories} ${isEn ? 'in' : 'zu'} / ${day.expenditure} ${isEn ? 'out' : 'ab'})`;
	}
	/** @param {number} v */
	function tooltipFormat(v) {
		const word = v > 0 ? (isEn ? 'surplus' : 'Überschuss') : (isEn ? 'deficit' : 'Defizit');
		return `${v > 0 ? '+' : ''}${Math.round(v)} kcal ${word}`;
	}
</script>

<svelte:head><title>{t.calorie_balance} - Bocken</title></svelte:head>

<div class="page">
	<h1>{t.calorie_balance}</h1>

	{#if !balance.hasTdee}
		<p class="empty">{t.set_height_birthyear_weight}</p>
	{:else if !balanceDays.length}
		<p class="empty">{t.no_nutrition_data}</p>
	{:else}
		<div class="stat-row">
			{#if avg7 != null}
				<div class="stat">
					<span class="num" class:pos={avg7 > 0} class:neg={avg7 < 0}>{avg7 > 0 ? '+' : ''}{avg7}<span class="u">kcal</span></span>
					<span class="lbl">{t.seven_day_avg}</span>
				</div>
			{/if}
			<div class="stat"><span class="num">{balanceDays.length}</span><span class="lbl">{isEn ? 'days estimated' : 'Tage geschätzt'}</span></div>
		</div>

		<div class="section-head">
			<h2>
				{isEn ? 'Daily deficit / surplus' : 'Tägliches Defizit / Überschuss'}
				{#if !zoom.isZoomed}
					<span class="h2-range">
						{isEn ? `last ${DEFAULT_DAYS} days` : `letzte ${DEFAULT_DAYS} Tage`}
					</span>
				{/if}
			</h2>
			<div class="zoom-controls">
				<span class="zoom-hint">{t.body_trends_hint}</span>
				<button class="reset-btn" onclick={zoom.reset} disabled={!zoom.isZoomed}>
					<RotateCcw size={14} /> {t.reset_zoom}
				</button>
			</div>
		</div>
		<FitnessChart
			type="bar"
			height="280px"
			data={balanceChart}
			goalLine={0}
			yUnit="kcal"
			tooltipFormatter={tooltipFormat}
			zoom
			applyXRange={zoom.xRange}
			onXRangeChange={zoom.onRange}
		/>
		<div class="legend">
			<span><i style="background: var(--green)"></i>{isEn ? 'surplus (over)' : 'Überschuss (darüber)'}</span>
			<span><i style="background: var(--red)"></i>{isEn ? 'deficit (under)' : 'Defizit (darunter)'}</span>
		</div>

		<h2>
			{isEn ? 'By day' : 'Nach Tag'}
			<span class="h2-range">{isEn ? 'last 365 days' : 'letzte 365 Tage'}</span>
		</h2>
		<ActivityGrid start={balance.start} end={balance.end} {byDate} {colorOf} {labelOf} {lang} />
		<p class="note">
			{isEn
				? 'Balance is that day’s intake minus estimated expenditure (BMR × activity, plus workout burn), using a smoothed body weight. Days without enough profile data to estimate expenditure are shown faint; unlogged days are empty.'
				: 'Die Bilanz ist die Tageszufuhr minus geschätzter Verbrauch (Grundumsatz × Aktivität, plus Trainingsverbrauch), mit geglättetem Körpergewicht. Tage ohne ausreichende Profildaten sind blass; nicht erfasste Tage leer.'}
		</p>
	{/if}
</div>

<style>
	.page { max-width: 1000px; margin-inline: auto; padding: 1rem; width: 100%; }
	h1 { margin: 0 0 1rem; font-size: 1.4rem; }
	h2 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
	.h2-range { font-size: 0.8rem; font-weight: 400; color: var(--color-text-secondary); margin-left: 0.4rem; }
	.section-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
	.section-head h2 { margin-bottom: 0.25rem; }
	.zoom-controls { display: inline-flex; align-items: center; gap: 0.75rem; }
	.zoom-hint { font-size: 0.8rem; color: var(--color-text-tertiary); }
	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: color var(--transition-fast), border-color var(--transition-fast);
	}
	.reset-btn:hover:not(:disabled) { color: var(--color-text-primary); border-color: var(--color-text-tertiary); }
	.reset-btn:disabled { opacity: 0.45; cursor: default; }
	@media (max-width: 560px) {
		.zoom-hint { display: none; }
	}
	.empty { color: var(--color-text-secondary); }
	.stat-row { display: flex; flex-wrap: wrap; gap: 1.5rem; }
	.stat { display: flex; flex-direction: column; }
	.num { font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.num .u { font-size: 0.8rem; font-weight: 500; color: var(--color-text-secondary); margin-left: 0.2rem; }
	.num.pos { color: var(--green); }
	.num.neg { color: var(--red); }
	.lbl { font-size: 0.8rem; color: var(--color-text-secondary); }
	.legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.5rem; }
	.legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
	.legend i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
	.note { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 60ch; margin-top: 0.75rem; }
</style>
