<script>
	import { onMount } from 'svelte';

	/**
	 * @type {{
	 *   type?: 'line' | 'bar',
	 *   data: { labels: string[], dates?: string[], datasets: Array<{ label: string, data: (number|null)[], borderColor?: string, backgroundColor?: string, borderWidth?: number, pointRadius?: number, pointBackgroundColor?: string, tension?: number, fill?: boolean|string, order?: number, type?: string, borderDash?: number[], [key: string]: any }> },
	 *   title?: string,
	 *   height?: string,
	 *   yUnit?: string,
	 *   goalLine?: number,
	 *   tooltipFormatter?: (value: number, datasetIndex: number, dataIndex: number, label: string) => string,
	 *   yMin?: number,
	 *   yMax?: number
	 * }}
	 */
	let { type = 'line', data, title = '', height = '250px', yUnit = '', goalLine = undefined, tooltipFormatter = undefined, yMin = undefined, yMax = undefined } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state(undefined);
	/** @type {import('chart.js').Chart | null} */
	let chart = $state(null);
	/** @type {typeof import('chart.js').Chart | null} */
	let ChartCtor = null;

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
		if (!canvas || !data?.datasets || !ChartCtor) return;
		if (chart) chart.destroy();

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dark = isDark();
		const textColor = dark ? '#D8DEE9' : '#2E3440';
		const gridColor = dark ? 'rgba(216,222,233,0.1)' : 'rgba(46,52,64,0.08)';

		const useTimeAxis = !!(data.dates && data.dates.length > 0);
		const dates = data.dates || [];
		const plainLabels = useTimeAxis ? [] : [...(data.labels || [])];
		const plainDatasets = (data.datasets || []).map((ds, i) => {
			const isLine = ds.type === 'line' || (type === 'line' && !ds.type);
			const isBar = ds.type === 'bar' || (type === 'bar' && !ds.type);
			const rawData = [...(ds.data || [])];
			// When using time axis, pair each value with its date
			const chartData = useTimeAxis
				? rawData.map((v, j) => ({ x: dates[j], y: v }))
				: rawData;
			return {
				...ds,
				data: chartData,
				borderColor: ds.borderColor || nordColors[i % nordColors.length],
				backgroundColor: ds.backgroundColor ?? (isBar
					? (nordColors[i % nordColors.length])
					: 'transparent'),
				borderWidth: ds.borderWidth ?? (isLine ? 2 : 0),
				pointRadius: ds.pointRadius ?? (isLine ? 3 : 0),
				pointBackgroundColor: ds.pointBackgroundColor || ds.borderColor || nordColors[i % nordColors.length],
				tension: ds.tension ?? 0.3,
				fill: ds.fill ?? false,
				spanGaps: true,
				order: ds.order ?? i,
				...(isBar ? { maxBarThickness: 40 } : {})
			};
		});

		/** @type {import('chart.js').Plugin[]} */
		const plugins = [];
		if (goalLine != null) {
			plugins.push({
				id: 'goalLine',
				afterDraw(chart) {
					const yScale = chart.scales.y;
					const xScale = chart.scales.x;
					if (!yScale || !xScale) return;
					const y = yScale.getPixelForValue(goalLine);
					const ctx = chart.ctx;
					ctx.save();
					ctx.beginPath();
					ctx.setLineDash([]);
					ctx.strokeStyle = '#EBCB8B';
					ctx.lineWidth = 2;
					ctx.moveTo(xScale.left, y);
					ctx.lineTo(xScale.right, y);
					ctx.stroke();
					ctx.restore();
				}
			});
		}

		chart = new ChartCtor(ctx, /** @type {any} */ ({
			type,
			data: { labels: plainLabels, datasets: plainDatasets },
			plugins,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 0 },
				interaction: type === 'line' ? { mode: 'index', intersect: false } : undefined,
				scales: {
					x: useTimeAxis ? {
						type: 'time',
						time: { unit: 'day', tooltipFormat: 'MMM d' },
						grid: { display: false },
						border: { display: false },
						ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 8 }
					} : {
						grid: { display: false },
						border: { display: false },
						ticks: { color: textColor, font: { size: 11 }, maxTicksLimit: 8 }
					},
					y: {
						beginAtZero: type === 'bar',
						suggestedMin: yMin,
						suggestedMax: yMax,
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
						padding: 10,
						filter: (/** @type {any} */ ctx) => !(ctx.dataset?.label ?? '').includes('σ'),
						...(tooltipFormatter ? {
							callbacks: {
								label: (/** @type {any} */ ctx) => {
									const v = ctx.parsed.y;
									const label = ctx.dataset.label ?? '';
									if (v == null) return label;
									const formatted = tooltipFormatter(v, ctx.datasetIndex, ctx.dataIndex, label);
									return `${label}: ${formatted}`;
								}
							}
						} : {})
					}
				})
			}
		}));
	}

	onMount(() => {
		let disposed = false;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => setTimeout(createChart, 100);
		/** @type {MutationObserver | undefined} */
		let obs;

		(async () => {
			const [{ Chart, registerables }] = await Promise.all([
				import('chart.js'),
				import('chartjs-adapter-date-fns')
			]);
			if (disposed) return;
			Chart.register(...registerables);
			ChartCtor = Chart;
			createChart();
			requestAnimationFrame(() => {
				if (chart) {
					chart.options.animation = { duration: 300 };
					chart.options.transitions = {
						active: { animation: { duration: 200 } }
					};
				}
			});
			mq.addEventListener('change', onTheme);
			obs = new MutationObserver((muts) => {
				for (const m of muts) {
					if (m.attributeName === 'data-theme') onTheme();
				}
			});
			obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		})();

		return () => {
			disposed = true;
			mq.removeEventListener('change', onTheme);
			obs?.disconnect();
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
