<script>
	import { page } from '$app/state';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { createAxisWidthGroup } from '$lib/stores/axisWidthGroup.svelte';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const isEn = $derived(lang === 'en');

	// Matches the protein card on the stats dashboard.
	const GREEN = '#A3BE8C';
	const ORANGE = '#D08770';
	const GREY = '#8FBCBB';
	// The inputs chart pairs a deep blue bar with a light purple line over it — far
	// enough apart in both hue and lightness to stay legible where they overlap.
	const BAR_BLUE = '#5E81AC';
	const LINE_PURPLE = '#B48EAD';

	const protein = $derived(data.protein ?? { series: [], start: '', end: '' });
	/** @type {any[]} */
	const series = $derived(protein.series ?? []);
	// Only days with a weight to divide by carry a ratio.
	const ratioDays = $derived(series.filter((/** @type {any} */ d) => d.gPerKg != null));

	/** @type {Record<string, any>} */
	const byDate = $derived(Object.fromEntries(series.map((/** @type {any} */ d) => [d.date, d])));

	// Plot from the first logged day — a leading untracked run-up has nothing to draw.
	const chartStart = $derived(series.length ? series[0].date : protein.start);

	// Every calendar day in the window, gaps included: an unlogged day is a null
	// (a break in the line), not a skipped one, so the spacing stays calendar-true.
	const allDates = $derived.by(() => {
		/** @type {string[]} */
		const out = [];
		if (!chartStart || !protein.end) return out;
		let cur = new Date(chartStart + 'T00:00:00.000Z');
		const end = new Date(protein.end + 'T00:00:00.000Z');
		while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur = new Date(cur.getTime() + 86400000); }
		return out;
	});

	// A year of daily points is a few pixels each; open on the last month and let
	// panning / pinching reach the rest, same gestures as the body-trend charts.
	const DEFAULT_DAYS = 30;

	/** @param {string} d */
	function stamp(d) { return new Date(d + 'T00:00:00.000Z').getTime(); }

	const defaultRange = $derived.by(() => {
		if (!allDates.length) return null;
		const max = stamp(allDates[allDates.length - 1]);
		const min = Math.max(stamp(allDates[0]), max - (DEFAULT_DAYS - 1) * 86400000);
		return { min, max };
	});

	// A user gesture takes over from the default; resetting hands it back. Both
	// charts read the same range, so they stay aligned while panning either one.
	/** @type {{ min: number, max: number } | null} */
	let userRange = $state(null);
	const xRange = $derived(userRange ?? defaultRange);
	const isZoomed = $derived(userRange !== null);
	/** @param {{ min: number, max: number }} r */
	function onRange(r) { userRange = { ...r }; }
	function resetZoom() { userRange = null; }

	// Shared axis widths so the two stacked charts' plot areas start and end at the
	// same x — the ratio chart has no right-hand series, so it reserves the width the
	// weight axis below it takes.
	const yGroup = createAxisWidthGroup();
	const y2Group = createAxisWidthGroup();

	// The goal line rides along as its own dataset rather than a flat `goalLine`,
	// because a grams-per-day goal expressed per kg moves with body weight.
	const hasTarget = $derived(ratioDays.some((/** @type {any} */ d) => d.targetPerKg != null));

	// Bars, not a line: a day's intake is a quantity that stands on its own —
	// yesterday's protein doesn't carry into today, so there is nothing to
	// interpolate between two days. (Weight below is the opposite, and stays a line.)
	// Bars are tinted against that day's target when there is one, so hitting or
	// missing it reads without tracing the dashed line.
	const ratioChart = $derived({
		dates: allDates,
		datasets: [
			{
				label: t.protein_per_kg_unit,
				// Bars carry no visible border (borderWidth 0 for bars), so this only
				// sets what the chart's built-in colour key would sample. Matching the
				// target line's colour keeps that key from appearing at all — one
				// swatch can't stand for two bar tints, and the HTML legend below says
				// what the colours mean instead.
				borderColor: GREY,
				order: 1, // lowest order draws last, so the target line lands on top
				data: allDates.map((/** @type {string} */ d) => byDate[d]?.gPerKg ?? null),
				backgroundColor: allDates.map((/** @type {string} */ d) => {
					const day = byDate[d];
					if (!day || day.gPerKg == null) return 'transparent';
					if (day.targetPerKg == null) return GREEN;
					return day.gPerKg >= day.targetPerKg ? GREEN : ORANGE;
				}),
			},
			...(hasTarget
				? [{
						label: t.target,
						type: 'line',
						order: 0,
						data: allDates.map((/** @type {string} */ d) => byDate[d]?.targetPerKg ?? null),
						borderColor: GREY,
						borderWidth: 1.5,
						borderDash: [5, 4],
						pointRadius: 0,
						tension: 0,
						fill: false,
					}]
				: []),
		],
	});

	// Both inputs on one chart, so a move in the ratio above can be read back to its
	// cause: total protein as bars on the left axis, body weight as a line on its own
	// axis at the right. The weight *is* a line — one continuous quantity sampled now
	// and then, so the days between two weigh-ins genuinely sit on it.
	const inputsChart = $derived({
		dates: allDates,
		datasets: [
			{
				label: t.protein_grams,
				data: allDates.map((/** @type {string} */ d) => byDate[d]?.protein ?? null),
				backgroundColor: BAR_BLUE,
				borderColor: BAR_BLUE,
				// Chart.js draws the *lowest* order last, i.e. on top — so the bars take
				// the higher number and the weight line rides over them.
				order: 1,
			},
			{
				label: t.weight,
				type: 'line',
				yAxisID: 'y2',
				order: 0,
				data: allDates.map((/** @type {string} */ d) => byDate[d]?.weight ?? null),
				borderColor: LINE_PURPLE,
				borderWidth: 2.5,
				pointRadius: 0,
				tension: 0.25,
				fill: false,
			},
		],
	});

	/** @param {number} v @param {number} datasetIndex @param {number} dataIndex */
	function ratioTooltip(v, datasetIndex, dataIndex) {
		const base = `${v.toFixed(2)} ${t.protein_per_kg_unit}`;
		if (datasetIndex !== 0) return base;
		const day = byDate[allDates[dataIndex]];
		if (!day) return base;
		return `${base} · ${day.protein} g / ${day.weight} kg`;
	}

	/** @param {number} v @param {number} datasetIndex */
	function inputsTooltip(v, datasetIndex) {
		return datasetIndex === 0 ? `${Math.round(v)} g` : `${v.toFixed(2)} kg`;
	}
</script>

<svelte:head><title>{t.protein_per_kg_title} - Bocken</title></svelte:head>

<div class="page">
	<h1>{t.protein_per_kg_title}</h1>

	{#if !series.length}
		<p class="empty">{t.no_nutrition_data}</p>
	{:else if !ratioDays.length}
		<p class="empty">{t.no_weight_data}</p>
	{:else}
		<div class="stat-row">
			{#if protein.avg7 != null}
				<div class="stat">
					<span class="num">{protein.avg7.toFixed(1)}<span class="u">{t.protein_per_kg_unit}</span></span>
					<span class="lbl">{t.seven_day_avg}</span>
				</div>
			{/if}
			{#if protein.avg30 != null}
				<div class="stat">
					<span class="num">{protein.avg30.toFixed(1)}<span class="u">{t.protein_per_kg_unit}</span></span>
					<span class="lbl">{t.thirty_day_avg}</span>
				</div>
			{/if}
			{#if protein.targetPerKg != null}
				<div class="stat">
					<span class="num">{protein.targetPerKg.toFixed(1)}<span class="u">{t.protein_per_kg_unit}</span></span>
					<span class="lbl">{t.target}</span>
				</div>
			{/if}
			<div class="stat">
				<span class="num">{protein.daysNormalised}</span>
				<span class="lbl">{t.days_normalised}</span>
			</div>
		</div>

		<div class="section-head">
			<h2>
				{t.protein_per_kg_daily}
				{#if !isZoomed}
					<span class="h2-range">
						{isEn ? `last ${DEFAULT_DAYS} days` : `letzte ${DEFAULT_DAYS} Tage`}
					</span>
				{/if}
			</h2>
			<div class="zoom-controls">
				<span class="zoom-hint">{t.body_trends_hint}</span>
				<button class="reset-btn" onclick={resetZoom} disabled={!isZoomed}>
					<RotateCcw size={14} /> {t.reset_zoom}
				</button>
			</div>
		</div>
		<FitnessChart
			type="bar"
			height="300px"
			data={ratioChart}
			yUnit=" {t.protein_per_kg_unit}"
			yDecimals={1}
			tooltipFormatter={ratioTooltip}
			yWidthGroup={yGroup}
			y2WidthGroup={y2Group}
			zoom
			applyXRange={xRange}
			onXRangeChange={onRange}
		/>
		{#if hasTarget}
			<div class="legend">
				<span><i style="background: {GREEN}"></i>{isEn ? 'target met' : 'Ziel erreicht'}</span>
				<span><i style="background: {ORANGE}"></i>{isEn ? 'under target' : 'unter Ziel'}</span>
				<span><i class="dash" style="border-color: {GREY}"></i>{t.target}</span>
			</div>
		{/if}

		<h2>{t.protein_per_kg_inputs}</h2>
		<FitnessChart
			type="bar"
			height="240px"
			data={inputsChart}
			yUnit=" g"
			y2Unit=" kg"
			yDecimals={0}
			y2Decimals={1}
			tooltipFormatter={inputsTooltip}
			yWidthGroup={yGroup}
			y2WidthGroup={y2Group}
			zoom
			applyXRange={xRange}
			onXRangeChange={onRange}
		/>

		<p class="note">
			{t.protein_per_kg_note}
			{#if protein.proteinMode === 'fixed' && protein.proteinTarget}
				{t.protein_per_kg_note_fixed}
			{/if}
		</p>
	{/if}
</div>

<style>
	.page { max-width: 1000px; margin-inline: auto; padding: 1rem; width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
	h1 { margin: 0 0 0.5rem; font-size: 1.4rem; }
	h2 { font-size: 1rem; margin: 1rem 0 0.25rem; }
	.h2-range { font-size: 0.8rem; font-weight: 400; color: var(--color-text-secondary); margin-left: 0.4rem; }
	.section-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
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
	.lbl { font-size: 0.8rem; color: var(--color-text-secondary); }
	.legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--color-text-secondary); }
	.legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
	.legend i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
	.legend i.dash { width: 14px; height: 0; border-radius: 0; border-top: 2px dashed; }
	.note { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 60ch; margin-top: 0.75rem; }
</style>
