<script>
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';

	/**
	 * A progress chart card of the segment pages: heading, the trend chart
	 * (`buildTrendChart`) and a one-line reading hint ("lower is faster").
	 * @type {{ title: string, data: any, height: string, tooltipFormatter: (v: number) => string, hint: string }}
	 */
	let { title, data, height, tooltipFormatter, hint } = $props();
</script>

<section class="chart-section">
	<h2><TrendingUp size={17} /> {title}</h2>
	<FitnessChart {data} {height} {tooltipFormatter} />
	<p class="chart-hint">{hint}</p>
</section>

<style>
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
</style>
