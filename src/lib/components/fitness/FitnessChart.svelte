<script>
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	/**
	 * @type {{
	 *   type?: 'line' | 'bar',
	 *   data: { labels: string[], datasets: Array<{ label: string, data: (number|null)[], borderColor?: string, backgroundColor?: string, borderWidth?: number, pointRadius?: number, pointBackgroundColor?: string, tension?: number, fill?: boolean|string, order?: number }> },
	 *   title?: string,
	 *   height?: string,
	 *   yUnit?: string
	 * }}
	 */
	let { type = 'line', data, title = '', height = '250px', yUnit = '' } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state(undefined);
	/** @type {Chart | null} */
	let chart = $state(null);
	let registered = false;

	const nordColors = [
		'#88C0D0', '#A3BE8C', '#EBCB8B', '#D08770', '#BF616A',
		'#B48EAD', '#5E81AC', '#81A1C1', '#8FBCBB'
	];

	function isDark() {
		const theme = document.documentElement.getAttribute('data-theme');
		if (theme === 'dark') return true;
		if (theme === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function createChart() {
		if (!canvas || !data?.datasets) return;
		if (!registered) {
			Chart.register(...registerables);
			registered = true;
		}
		if (chart) chart.destroy();

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dark = isDark();
		const textColor = dark ? '#D8DEE9' : '#2E3440';
		const gridColor = dark ? 'rgba(216,222,233,0.1)' : 'rgba(46,52,64,0.08)';

		const plainLabels = [...(data.labels || [])];
		const plainDatasets = (data.datasets || []).map((ds, i) => ({
			label: ds.label,
			data: [...(ds.data || [])],
			borderColor: ds.borderColor || nordColors[i % nordColors.length],
			backgroundColor: ds.backgroundColor ?? (type === 'bar'
				? (nordColors[i % nordColors.length])
				: 'transparent'),
			borderWidth: ds.borderWidth ?? (type === 'line' ? 2 : 0),
			pointRadius: ds.pointRadius ?? (type === 'line' ? 3 : 0),
			pointBackgroundColor: ds.pointBackgroundColor || ds.borderColor || nordColors[i % nordColors.length],
			tension: ds.tension ?? 0.3,
			fill: ds.fill ?? false,
			spanGaps: true,
			order: ds.order ?? i
		}));

		chart = new Chart(ctx, {
			type,
			data: { labels: plainLabels, datasets: plainDatasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 0 },
				scales: {
					x: {
						grid: { display: false },
						border: { display: false },
						ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 8 }
					},
					y: {
						beginAtZero: type === 'bar',
						grid: { color: gridColor },
						border: { display: false },
						ticks: {
							color: textColor,
							font: { size: 11 },
							stepSize: type === 'bar' ? 1 : undefined,
							callback: yUnit ? (/** @type {any} */ v) => `${v}${yUnit}` : undefined
						}
					}
				},
				plugins: /** @type {any} */ ({
					legend: {
						display: plainDatasets.length > 1,
						labels: {
							color: textColor,
							usePointStyle: true,
							padding: 12,
							filter: (/** @type {any} */ item) => !item.text?.includes('(lower)')
						}
					},
					title: {
						display: !!title,
						text: title,
						color: textColor,
						font: { size: 14, weight: 'bold' },
						padding: { bottom: 12 }
					},
					tooltip: {
						backgroundColor: dark ? '#2E3440' : '#ECEFF4',
						titleColor: dark ? '#ECEFF4' : '#2E3440',
						bodyColor: dark ? '#D8DEE9' : '#3B4252',
						borderWidth: 0,
						cornerRadius: 8,
						padding: 10
					}
				})
			}
		});
	}

	onMount(() => {
		createChart();
		requestAnimationFrame(() => {
			if (chart) {
				chart.options.animation = { duration: 300 };
				chart.options.transitions = {
					active: { animation: { duration: 200 } }
				};
			}
		});

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => setTimeout(createChart, 100);
		mq.addEventListener('change', onTheme);

		const obs = new MutationObserver((muts) => {
			for (const m of muts) {
				if (m.attributeName === 'data-theme') onTheme();
			}
		});
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		return () => {
			mq.removeEventListener('change', onTheme);
			obs.disconnect();
			if (chart) chart.destroy();
		};
	});
</script>

<div class="chart-container" style="height: {height}">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
		border: 1px solid var(--color-border);
	}
	canvas {
		max-width: 100%;
		height: 100% !important;
	}
</style>
