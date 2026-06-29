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
	const bfChart = $derived(data.bfChart ?? { dates: [], data: [], sma: [], upper: [], lower: [], baseline: null });

	const hasWeight = $derived((weightChart.data?.length ?? 0) > 1);
	const hasBf = $derived((bfChart.data?.length ?? 0) > 1);

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
			{ label: 'Body fat Δ (pp)', data: bfChart.data, borderColor: '#D08770', borderWidth: hasSmaBf ? 1 : 2, pointRadius: 2, order: 0 }
		]
	});

	/**
	 * @param {number} v
	 * @param {number} _datasetIndex
	 * @param {number} dataIndex
	 * @param {string} label
	 */
	function bfTooltipFormatter(v, _datasetIndex, dataIndex, label) {
		const baseline = bfChart.baseline ?? 0;
		const abs = baseline + v;
		const sign = v > 0 ? '+' : v < 0 ? '' : '±';
		const base = `${sign}${v.toFixed(2)} pp · ${abs.toFixed(1)}%`;
		if (label === 'Trend') {
			const upper = bfChart.upper?.[dataIndex];
			const lower = bfChart.lower?.[dataIndex];
			if (upper != null && lower != null) {
				const sigma = (upper - lower) / 2;
				const absLower = baseline + lower;
				const absUpper = baseline + upper;
				return `${sign}${v.toFixed(2)} ±${sigma.toFixed(2)} pp · ${abs.toFixed(1)}% (${absLower.toFixed(1)}–${absUpper.toFixed(1)}%)`;
			}
		}
		return base;
	}

	const bfChartTitle = $derived.by(() => {
		const baseline = bfChart.baseline;
		const label = t.body_fat.replace(' %', '').replace(' (%)', '');
		if (baseline == null) return label;
		return `${label} · ${t.bf_delta_from_prefix} ${baseline.toFixed(1)}%`;
	});

	// Full extent of the data (epoch ms), used to reset the zoom to "show all".
	const fullRange = $derived.by(() => {
		const stamps = [...(weightChart.dates ?? []), ...(bfChart.dates ?? [])].map((d) => new Date(d).getTime());
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
		<FitnessChart
			data={bfChartData}
			title={bfChartTitle}
			yUnit=" pp"
			height="320px"
			tooltipFormatter={bfTooltipFormatter}
			zoom
			applyXRange={xRange}
			onXRangeChange={onRange}
		/>
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
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem;
	}
</style>
