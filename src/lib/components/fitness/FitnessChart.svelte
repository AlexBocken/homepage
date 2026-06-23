<script>
	import { onMount } from 'svelte';

	/**
	 * @type {{
	 *   type?: 'line' | 'bar',
	 *   data: { labels?: string[], dates?: string[], datasets: Array<{ label: string, data: Array<number|null|{ x: number, y: number|null }>, borderColor?: string, backgroundColor?: string, borderWidth?: number, pointRadius?: number, pointBackgroundColor?: string, tension?: number, fill?: boolean|string, order?: number, type?: string, borderDash?: number[], [key: string]: any }> },
	 *   title?: string,
	 *   height?: string,
	 *   yUnit?: string,
	 *   goalLine?: number,
	 *   tooltipFormatter?: (value: number, datasetIndex: number, dataIndex: number, label: string) => string,
	 *   yMin?: number,
	 *   yMax?: number,
	 *   onHover?: (index: number | null) => void,
	 *   hoverIndex?: number | null,
	 *   xAxis?: { min: number, max: number, stepSize: number, unit?: string },
	 *   yWidthGroup?: import('$lib/stores/axisWidthGroup.svelte').AxisWidthGroup
	 * }}
	 *
	 * `xAxis` switches the x-axis to a numeric *linear* scale (instead of the
	 * default per-label category axis). Datasets must then carry `{x, y}` points.
	 * Used to give the GPS pace/elevation/cadence charts one shared distance axis
	 * with identical limits and clean, evenly-spaced ticks.
	 *
	 * `onHover` reports the data index under the pointer (null on leave) so a
	 * parent can sync an external cursor (e.g. a map pin). `hoverIndex` drives
	 * this chart's cursor from outside: a number highlights that point, `null`
	 * clears it, and `undefined` leaves the chart's native hover untouched (used
	 * for the chart that currently owns the pointer, so we don't fight Chart.js).
	 */
	let { type = 'line', data, title = '', height = '250px', yUnit = '', goalLine = undefined, tooltipFormatter = undefined, yMin = undefined, yMax = undefined, onHover = undefined, hoverIndex = undefined, xAxis = undefined, yWidthGroup = undefined } = $props();

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

		const useLinearX = !!xAxis;
		const useTimeAxis = !useLinearX && !!(data.dates && data.dates.length > 0);
		// Tooltip-visible series (drop the σ band + its lower bound).
		const visibleSeries = (data.datasets || [])
			.map((/** @type {any} */ d, /** @type {number} */ i) => ({ d, i }))
			.filter((/** @type {any} */ s) => !(s.d.label ?? '').includes('σ') && !(s.d.label ?? '').includes('(lower)'));
		const multiSeries = visibleSeries.length > 1;
		// Only show a colour key (chip dot + legend) when the series are actually
		// distinguishable by colour — pointless when they share a single colour.
		const seriesColors = new Set(
			visibleSeries.map((/** @type {any} */ s) => s.d.borderColor || nordColors[s.i % nordColors.length])
		);
		const showColorKey = multiSeries && seriesColors.size > 1;
		const dates = data.dates || [];
		const plainLabels = useTimeAxis || useLinearX ? [] : [...(data.labels || [])];
		const plainDatasets = (data.datasets || []).map((ds, i) => {
			const isLine = ds.type === 'line' || (type === 'line' && !ds.type);
			const isBar = ds.type === 'bar' || (type === 'bar' && !ds.type);
			const rawData = [...(ds.data || [])];
			// Time axis pairs each value with its date; linear x already carries
			// {x, y} points; otherwise the value sits on a category label.
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
		if (onHover) {
			// Dashed vertical cursor at the active point — mirrors the hike
			// elevation chart so an externally-driven hover reads clearly.
			const cursorColor = dark ? 'rgba(216,222,233,0.55)' : 'rgba(46,52,64,0.45)';
			plugins.push({
				id: 'hoverCursor',
				afterDatasetsDraw(chart) {
					const active = chart.tooltip?.getActiveElements?.() ?? [];
					if (active.length === 0) return;
					const x = /** @type {{ x: number }} */ (/** @type {unknown} */ (active[0].element)).x;
					const { top, bottom } = chart.chartArea;
					const ctx = chart.ctx;
					ctx.save();
					ctx.beginPath();
					ctx.moveTo(x, top);
					ctx.lineTo(x, bottom);
					ctx.setLineDash([4, 4]);
					ctx.lineWidth = 1;
					ctx.strokeStyle = cursorColor;
					ctx.stroke();
					ctx.restore();
				}
			});
		}
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
				onHover: onHover ? (/** @type {any} */ _evt, /** @type {any[]} */ elements) => {
					if (!elements || elements.length === 0) { onHover(null); return; }
					onHover(elements[0].index);
				} : undefined,
				scales: {
					x: useLinearX ? {
						type: 'linear',
						min: xAxis.min,
						max: xAxis.max,
						grid: { display: false },
						border: { display: false },
						ticks: {
							color: textColor,
							font: { size: 11 },
							stepSize: xAxis.stepSize,
							autoSkip: false,
							maxRotation: 0,
							// Tick values land on clean stepSize multiples; trim float noise.
							callback: (/** @type {any} */ v) => `${+Number(v).toFixed(3)}${xAxis.unit ?? ''}`
						}
					} : useTimeAxis ? {
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
						// Share one y-axis width across a stack of charts so their plot
						// areas start at the same x and line up vertically. We size to the
						// widest *tick label text* (not Chart.js's padded natural width,
						// which leaves slack) + a small gap, then pin to the group max.
						afterFit: yWidthGroup ? (/** @type {any} */ scale) => {
							const ctx = scale.ctx;
							const size = scale.options?.ticks?.font?.size ?? 11;
							ctx.save();
							ctx.font = `${size}px Helvetica, Arial, "Noto Sans", sans-serif`;
							let textW = 0;
							for (const tk of scale.ticks ?? []) {
								const label = tk.label ?? (yUnit ? `${scale.getLabelForValue(tk.value)}${yUnit}` : `${scale.getLabelForValue(tk.value)}`);
								const w = ctx.measureText(String(label)).width;
								if (w > textW) textW = w;
							}
							ctx.restore();
							yWidthGroup.report(Math.ceil(textW) + 10);
							scale.width = yWidthGroup.max;
						} : undefined,
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
						display: showColorKey,
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
						// Unified chip (from the run-detail charts): the value is the bold
						// headline, the x context (distance/date) a muted sub-line. Single
						// series drops the colour key; multi-series keeps it as a round dot
						// matching the chart legend (usePointStyle).
						backgroundColor: dark ? '#2E3440' : '#ECEFF4',
						titleColor: '#7B88A1',
						titleFont: { size: 11, weight: 'normal' },
						bodyColor: dark ? '#ECEFF4' : '#2E3440',
						bodyFont: { size: 14, weight: 'bold' },
						displayColors: showColorKey,
						usePointStyle: true,
						boxPadding: 6,
						borderWidth: 0,
						cornerRadius: 8,
						padding: 10,
						filter: (/** @type {any} */ ctx) => !(ctx.dataset?.label ?? '').includes('σ'),
						callbacks: {
							...(useLinearX ? {
								// Sub-line: distance, de-emphasized.
								title: (/** @type {any} */ items) => {
									const x = items?.[0]?.parsed?.x;
									if (x == null) return '';
									return `${+Number(x).toFixed(2)}${xAxis.unit ?? ''}`;
								}
							} : {}),
							label: (/** @type {any} */ ctx) => {
								const v = ctx.parsed.y;
								const label = ctx.dataset.label ?? '';
								if (v == null) return '';
								const formatted = tooltipFormatter
									? tooltipFormatter(v, ctx.datasetIndex, ctx.dataIndex, label)
									: `${v}${yUnit}`;
								// Single series: just the value. Multi: keep the dataset key.
								return multiSeries ? `${label}: ${formatted}` : formatted;
							}
						}
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

	// When another chart in the group reports a wider y-axis, re-run layout so
	// this chart's `afterFit` widens to the new shared max and stays aligned.
	$effect(() => {
		const max = yWidthGroup?.max;
		if (!chart || max == null) return;
		chart.update('none');
	});

	// Drive this chart's cursor from an external hover (e.g. a map pin or a
	// sibling chart). `undefined` means "not externally controlled" — leave the
	// chart's own hover alone.
	$effect(() => {
		const idx = hoverIndex;
		if (!chart || idx === undefined) return;
		if (idx === null) {
			chart.setActiveElements([]);
			chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
			chart.update('none');
			return;
		}
		const meta = chart.getDatasetMeta(0);
		const elem = /** @type {{ x: number, y: number } | undefined} */ (meta?.data?.[idx]);
		if (!elem) return;
		chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
		chart.tooltip?.setActiveElements([{ datasetIndex: 0, index: idx }], { x: elem.x, y: elem.y });
		chart.update('none');
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
