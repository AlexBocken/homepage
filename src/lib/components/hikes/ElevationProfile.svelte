<script lang="ts">
	import { onMount } from 'svelte';
	import type { Chart as ChartType } from 'chart.js';
	import type { HikeTrackPoint } from '$types/hikes';
	import { hover, setHover, clearHover } from './hoverStore.svelte';

	interface Props {
		track: HikeTrackPoint[];
		/** Restrict the x-axis to a stage's index range (multi-day hikes). The
		 * dataset stays the full track so hover indices remain global. */
		viewRange?: { startIdx: number; endIdx: number } | null;
	}

	const { track, viewRange = null }: Props = $props();

	// x-axis window in km for the current view (whole track, or a stage slice).
	function xBounds(): { min: number; max: number } {
		const last = cumKm[cumKm.length - 1] ?? 0;
		if (!viewRange) return { min: 0, max: last };
		const lo = Math.max(0, Math.min(viewRange.startIdx, cumKm.length - 1));
		const hi = Math.max(0, Math.min(viewRange.endIdx, cumKm.length - 1));
		return { min: cumKm[lo] ?? 0, max: cumKm[hi] ?? last };
	}

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let chart: ChartType | null = null;
	let ChartCtor: typeof import('chart.js').Chart | null = null;

	// Cumulative distance (km) per track point — used as x axis.
	const cumKm = $derived.by(() => {
		const out = new Array<number>(track.length);
		out[0] = 0;
		const R = 6371;
		for (let i = 1; i < track.length; i++) {
			const a = track[i - 1];
			const b = track[i];
			const dLat = ((b[1] - a[1]) * Math.PI) / 180;
			const dLng = ((b[0] - a[0]) * Math.PI) / 180;
			const sinLat = Math.sin(dLat / 2);
			const sinLng = Math.sin(dLng / 2);
			const h =
				sinLat * sinLat +
				Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinLng * sinLng;
			out[i] = out[i - 1] + 2 * R * Math.asin(Math.sqrt(h));
		}
		return out;
	});

	function isDark(): boolean {
		const t = document.documentElement.getAttribute('data-theme');
		if (t === 'dark') return true;
		if (t === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function readPrimaryColor(): string {
		const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
		return v || '#5e81ac';
	}

	function hexToRgba(hex: string, alpha: number): string {
		const h = hex.replace('#', '');
		const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
		const r = parseInt(full.slice(0, 2), 16);
		const g = parseInt(full.slice(2, 4), 16);
		const b = parseInt(full.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	function createChart() {
		if (!canvas || !ChartCtor) return;
		if (chart) chart.destroy();

		const dark = isDark();
		const textColor = dark ? '#D8DEE9' : '#2E3440';
		const gridColor = dark ? 'rgba(216,222,233,0.1)' : 'rgba(46,52,64,0.08)';
		const primary = readPrimaryColor();

		const data = track.map((p, i) => ({ x: cumKm[i], y: typeof p[2] === 'number' ? p[2] : null }));

		// Custom plugin: a dashed vertical guide line at the chart's
		// active-element x. Works for both pointer-driven hovers and the
		// externally-triggered setActiveElements path (map, scroll tracker)
		// because both populate `chart.tooltip._active`.
		const verticalLine = {
			id: 'verticalCursor',
			afterDatasetsDraw(c: ChartType) {
				const active = c.tooltip?.getActiveElements?.() ?? [];
				if (active.length === 0) return;
				const x = (active[0].element as unknown as { x: number }).x;
				const { top, bottom } = c.chartArea;
				const ctx = c.ctx;
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(x, top);
				ctx.lineTo(x, bottom);
				ctx.setLineDash([4, 4]);
				ctx.lineWidth = 1;
				ctx.strokeStyle = primary;
				ctx.globalAlpha = 0.85;
				ctx.stroke();
				ctx.restore();
			}
		};

		chart = new ChartCtor(canvas, {
			type: 'line',
			data: {
				datasets: [
					{
						label: 'Höhe',
						data,
						borderColor: primary,
						backgroundColor: hexToRgba(primary, 0.18),
						borderWidth: 2,
						pointRadius: 0,
						// Active state needs to be visually obvious: a solid
						// dot at the hovered index, with the dashed line from
						// the custom plugin above carrying the eye down to the
						// x-axis.
						pointHoverRadius: 6,
						pointHoverBackgroundColor: primary,
						pointHoverBorderColor: '#fff',
						pointHoverBorderWidth: 2,
						tension: 0.2,
						fill: 'origin',
						spanGaps: true
					}
				]
			},
			plugins: [verticalLine],
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						displayColors: false,
						callbacks: {
							title: (items) => `${(items[0].parsed.x as number).toFixed(2)} km`,
							label: (item) => `${Math.round(item.parsed.y as number)} m`
						}
					}
				},
				scales: {
					x: {
						type: 'linear',
						// Pin the axis to the actual data range so Chart.js doesn't
						// round up to the next nice tick — otherwise a 12.3 km hike
						// ends up with empty space out to 14 km. When a stage is
						// selected, the window narrows to that stage.
						min: xBounds().min,
						max: xBounds().max,
						bounds: 'data',
						title: { display: true, text: 'Distanz (km)', color: textColor },
						ticks: { color: textColor },
						grid: { color: gridColor }
					},
					y: {
						title: { display: true, text: 'Höhe (m)', color: textColor },
						ticks: { color: textColor },
						grid: { color: gridColor }
					}
				},
				onHover: (_evt, elements) => {
					if (elements.length === 0) {
						if (hover.source === 'chart') clearHover();
						return;
					}
					setHover(elements[0].index, 'chart');
				}
			}
		});
	}

	onMount(() => {
		let disposed = false;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => setTimeout(createChart, 100);
		let obs: MutationObserver | undefined;

		(async () => {
			const { Chart, registerables } = await import('chart.js');
			if (disposed) return;
			Chart.register(...registerables);
			ChartCtor = Chart;
			createChart();
			mq.addEventListener('change', onTheme);
			obs = new MutationObserver((muts) => {
				for (const m of muts) if (m.attributeName === 'data-theme') onTheme();
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

	// React to external hover (from the map, image markers, or the page-
	// level scroll tracker) by painting the matching tooltip + cursor at
	// the right pixel position.
	//
	// IMPORTANT: read both `hover.source` and `hover.index` at the very
	// top of the effect so Svelte registers the subscription on the first
	// run — even when the Chart.js instance isn't ready yet (the import is
	// async). If we early-returned on `!chart` first, the hover reads
	// would never happen and the effect would never re-run for external
	// updates after the chart finally mounted.
	$effect(() => {
		const src = hover.source;
		const idx = hover.index;
		if (!chart) return;
		if (src === 'chart') return;
		if (idx === null) {
			chart.setActiveElements([]);
			chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
			chart.update('none');
			return;
		}
		if (idx < 0 || idx >= track.length) return;
		const datasetIndex = 0;
		const meta = chart.getDatasetMeta(datasetIndex);
		const elem = meta?.data?.[idx] as { x: number; y: number } | undefined;
		const anchor = elem ? { x: elem.x, y: elem.y } : { x: 0, y: 0 };
		chart.setActiveElements([{ datasetIndex, index: idx }]);
		chart.tooltip?.setActiveElements([{ datasetIndex, index: idx }], anchor);
		chart.update('none');
	});

	// Re-window the x-axis when the active stage changes (reads `viewRange`).
	$effect(() => {
		const b = (() => {
			void viewRange;
			return xBounds();
		})();
		if (!chart) return;
		const xScale = chart.options.scales?.x;
		if (!xScale) return;
		xScale.min = b.min;
		xScale.max = b.max;
		chart.update('none');
	});

	// Rebuild the dataset when the track data itself changes — e.g. the route
	// builder edits the route live. On the static detail page `track` is stable
	// after its one-time fetch, so this runs once (no-op) and never again.
	$effect(() => {
		const pts = track;
		const ck = cumKm;
		if (!chart) return;
		chart.data.datasets[0].data = pts.map((p, i) => ({
			x: ck[i],
			y: typeof p[2] === 'number' ? p[2] : null
		}));
		const b = xBounds();
		const xScale = chart.options.scales?.x;
		if (xScale) {
			xScale.min = b.min;
			xScale.max = b.max;
		}
		chart.update('none');
	});

	// Mouse-leave on the canvas clears the shared hover state so the map marker
	// disappears too.
	function onCanvasMouseLeave() {
		if (hover.source === 'chart') clearHover();
	}
</script>

<div class="elevation">
	<canvas bind:this={canvas} onmouseleave={onCanvasMouseLeave}></canvas>
</div>

<style>
	.elevation {
		position: relative;
		width: 100%;
		height: 220px;
		margin-top: 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 0.75rem 1rem;
		box-shadow: var(--shadow-sm);
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>
