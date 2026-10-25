<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { isDarkTheme, onThemeChange } from '$lib/js/darkMode.svelte';
	import type { WeekSummary } from '$lib/server/caseMath';

	let { weeks, height = '280px' }: { weeks: WeekSummary[]; height?: string } = $props();

	Chart.register(...registerables);

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;

	function build() {
		chart?.destroy();
		if (!canvas) return;
		const dark = isDarkTheme();
		const text = dark ? '#D8DEE9' : '#2E3440';
		const grid = dark ? 'rgba(216, 222, 233, 0.1)' : 'rgba(46, 52, 64, 0.08)';
		const accuracyColor = '#A3BE8C';
		const speedColor = '#D08770';
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: weeks.map((w) => w.week.slice(5)),
				datasets: [
					{
						label: 'Accuracy',
						data: weeks.map((w) => Math.round(w.accuracy * 100)),
						borderColor: accuracyColor,
						backgroundColor: accuracyColor,
						yAxisID: 'acc',
						tension: 0.3
					},
					{
						label: 'Time vs target',
						data: weeks.map((w) => (w.speed === null ? null : Math.round(w.speed * 100) / 100)),
						borderColor: speedColor,
						backgroundColor: speedColor,
						yAxisID: 'speed',
						tension: 0.3,
						borderDash: [5, 4]
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { labels: { color: text } },
					tooltip: {
						callbacks: {
							title: (items) => `Week of ${weeks[items[0].dataIndex].week}`,
							label: (item) =>
								item.datasetIndex === 0
									? `Accuracy ${item.formattedValue}% (${weeks[item.dataIndex].count} answered)`
									: `Median time ${item.formattedValue}× target`
						}
					}
				},
				scales: {
					x: { ticks: { color: text }, grid: { color: grid } },
					acc: {
						position: 'left',
						min: 0,
						max: 100,
						ticks: { color: text, callback: (v) => `${v}%` },
						grid: { color: grid }
					},
					speed: {
						position: 'right',
						min: 0,
						suggestedMax: 2,
						ticks: { color: text, callback: (v) => `${v}×` },
						grid: { display: false }
					}
				}
			}
		});
	}

	onMount(() => {
		build();
		const off = onThemeChange(build);
		return () => {
			off();
			chart?.destroy();
		};
	});

	$effect(() => {
		void weeks;
		if (chart) build();
	});
</script>

<div class="chart" style:height>
	<canvas bind:this={canvas} aria-label="Weekly accuracy and speed"></canvas>
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
	}
</style>
