<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const statsSlug = $derived(fitnessSlugs(lang).stats);

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const theme = document.documentElement.dataset.theme;
		if (theme === 'dark') return true;
		if (theme === 'light') return false;
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
	const primaryFill = $derived(dark ? 'rgba(136, 192, 208, 0.15)' : 'rgba(94, 129, 172, 0.15)');
	const bfAccent = '#B48EAD';
	const bfAccentFill = $derived(dark ? 'rgba(180, 142, 173, 0.2)' : 'rgba(180, 142, 173, 0.16)');

	const weightChart = $derived(data.weightChart ?? { dates: [], data: [], sma: [], upper: [], lower: [] });
	const emptyBf = { dates: [], data: [], sma: [], upper: [], lower: [], baseline: null };
	const bfPctChart = $derived(data.bfChart ?? emptyBf);
	const bfMassChart = $derived(data.bfMassChart ?? emptyBf);

	// Body fat can be read as a percentage of body weight or as fat mass in kg —
	// both plotted as Δ from their own first reading.
	let bfUnit = $state(/** @type {'pct' | 'kg'} */ ('pct'));
	const hasBfPct = $derived((bfPctChart.data?.length ?? 0) > 1);
	const hasBfMass = $derived((bfMassChart.data?.length ?? 0) > 1);
	const bfChart = $derived(bfUnit === 'kg' && hasBfMass ? bfMassChart : bfPctChart);
	const bfUnitSuffix = $derived(bfUnit === 'kg' && hasBfMass ? ' kg' : ' pp');

	const hasWeight = $derived((weightChart.data?.length ?? 0) > 1);
	const hasBf = $derived(hasBfPct || hasBfMass);

	const hasSma = $derived(weightChart.sma?.some((/** @type {any} */ v) => v !== null));
	const hasSmaBf = $derived(bfChart.sma?.some((/** @type {any} */ v) => v !== null));

	const weightChartData = $derived({
		dates: weightChart.dates,
		datasets: [
			...(hasSma ? [
				{ label: '± 1σ', data: weightChart.upper, borderColor: 'transparent', backgroundColor: primaryFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: '± 1σ (lower)', data: weightChart.lower, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: 'Trend', data: weightChart.sma, borderColor: primary, pointRadius: 0, borderWidth: 3, tension: 0.3, order: 1 }
			] : []),
			{ label: 'Weight (kg)', data: weightChart.data, borderColor: '#A3BE8C', borderWidth: hasSma ? 1 : 2, pointRadius: 2, order: 0 }
		]
	});

	const bfChartData = $derived({
		dates: bfChart.dates,
		datasets: [
			...(hasSmaBf ? [
				{ label: '± 1σ', data: bfChart.upper, borderColor: 'transparent', backgroundColor: bfAccentFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: '± 1σ (lower)', data: bfChart.lower, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: 'Trend', data: bfChart.sma, borderColor: bfAccent, pointRadius: 0, borderWidth: 3, tension: 0.3, order: 1 }
			] : []),
			{ label: bfUnit === 'kg' ? 'Fat mass Δ (kg)' : 'Body fat Δ (pp)', data: bfChart.data, borderColor: '#D08770', borderWidth: hasSmaBf ? 1 : 2, pointRadius: 2, order: 0 }
		]
	});

	/**
	 * @param {number} v
	 * @param {number} _datasetIndex
	 * @param {number} dataIndex
	 * @param {string} label
	 */
	function bfTooltipFormatter(v, _datasetIndex, dataIndex, label) {
		const kg = bfUnit === 'kg' && hasBfMass;
		const deltaUnit = kg ? ' kg' : ' pp';
		const absUnit = kg ? ' kg' : '%';
		const baseline = bfChart.baseline ?? 0;
		const abs = baseline + v;
		const sign = v > 0 ? '+' : v < 0 ? '' : '±';
		const base = `${sign}${v.toFixed(2)}${deltaUnit} · ${abs.toFixed(1)}${absUnit}`;
		if (label === 'Trend') {
			const upper = bfChart.upper?.[dataIndex];
			const lower = bfChart.lower?.[dataIndex];
			if (upper != null && lower != null) {
				const sigma = (upper - lower) / 2;
				const absLower = baseline + lower;
				const absUpper = baseline + upper;
				return `${sign}${v.toFixed(2)} ±${sigma.toFixed(2)}${deltaUnit} · ${abs.toFixed(1)}${absUnit} (${absLower.toFixed(1)}–${absUpper.toFixed(1)}${absUnit})`;
			}
		}
		return base;
	}

	const bfChartTitle = $derived.by(() => {
		const kg = bfUnit === 'kg' && hasBfMass;
		const baseline = bfChart.baseline;
		const label = kg ? t.fat_mass : t.body_fat.replace(' %', '').replace(' (%)', '');
		if (baseline == null) return label;
		const base = kg ? `${baseline.toFixed(1)} kg` : `${baseline.toFixed(1)}%`;
		return `${label} · ${t.bf_delta_from_prefix} ${base}`;
	});

	// Full extent of the data (epoch ms), used to reset the zoom to "show all".
	const fullRange = $derived.by(() => {
		const stamps = [...(weightChart.dates ?? []), ...(bfChart.dates ?? [])].map((/** @type {string} */ d) => new Date(d).getTime());
		if (!stamps.length) return null;
		return { min: Math.min(...stamps), max: Math.max(...stamps) };
	});

	// Shared x window. null = full range (charts render unzoomed). A user gesture
	// on either chart writes here; both charts mirror it via applyXRange.
	/** @type {{ min: number, max: number } | null} */
	let xRange = $state(null);
	/** @param {{ min: number, max: number }} r */
	function onRange(r) { xRange = { ...r }; }
	function resetZoom() { if (fullRange) xRange = { ...fullRange }; }
</script>

<svelte:head><title>{t.body_trends_title} - Bocken</title></svelte:head>

<div class="body-detail">
	<div class="detail-head">
		<a class="back-link" href={resolve('/fitness/[stats=fitnessStats]', { stats: statsSlug })}>
			<ChevronLeft size={18} /> {t.stats_title}
		</a>
		<h1>{t.body_trends_title}</h1>
		<div class="head-row">
			<span class="zoom-hint">{t.body_trends_hint}</span>
			<button class="reset-btn" onclick={resetZoom} disabled={xRange === null}>
				<RotateCcw size={14} /> {t.reset_zoom}
			</button>
		</div>
	</div>

	{#if hasWeight}
		<FitnessChart
			data={weightChartData}
			title={t.weight}
			yUnit=" kg"
			height="320px"
			zoom
			applyXRange={xRange}
			onXRangeChange={onRange}
		/>
	{/if}

	{#if hasBf}
		{#if hasBfPct && hasBfMass}
			<div class="unit-switch" role="group" aria-label={t.bf_unit_switch_label}>
				<button
					class="unit-btn"
					class:is-active={bfUnit === 'pct'}
					aria-pressed={bfUnit === 'pct'}
					onclick={() => (bfUnit = 'pct')}
				>%</button>
				<button
					class="unit-btn"
					class:is-active={bfUnit === 'kg'}
					aria-pressed={bfUnit === 'kg'}
					onclick={() => (bfUnit = 'kg')}
				>kg</button>
			</div>
		{/if}
		<!-- FitnessChart builds its canvas once on mount, so switching units has to
		     remount it. The current x window is restored via applyXRange. -->
		{#key bfUnit}
			<FitnessChart
				data={bfChartData}
				title={bfChartTitle}
				yUnit={bfUnitSuffix}
				height="320px"
				tooltipFormatter={bfTooltipFormatter}
				zoom
				applyXRange={xRange}
				onXRangeChange={onRange}
			/>
		{/key}
	{/if}

	{#if !hasWeight && !hasBf}
		<p class="empty">{t.no_weight_data}</p>
	{/if}
</div>

<style>
	.body-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 1000px;
		margin-inline: auto;
		width: 100%;
	}
	.detail-head {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		align-self: flex-start;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
		text-decoration: none;
		border-radius: var(--radius-pill, 1000px);
		transition: color var(--transition-fast, 120ms);
	}
	.back-link:hover { color: var(--color-text-primary); }
	.detail-head h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.zoom-hint {
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}
	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
	}
	.reset-btn:hover:not(:disabled) {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
	}
	.reset-btn:disabled { opacity: 0.45; cursor: default; }
	.unit-switch {
		display: flex;
		gap: 0.25rem;
		align-self: flex-end;
		margin-bottom: -0.5rem;
		background: var(--color-bg-tertiary);
		padding: 0.2rem;
		border-radius: var(--radius-pill);
	}
	.unit-btn {
		padding: 0.3rem 0.9rem;
		border: none;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.unit-btn:hover:not(.is-active) { color: var(--color-text-primary); }
	.unit-btn.is-active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem;
	}
</style>
