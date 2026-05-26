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
	// Goes true once Chart.js has painted at least one frame. Drives the
	// cross-fade from the SSR-rendered static SVG to the interactive canvas.
	// Stays sticky-true on theme re-creation so the SVG doesn't flash back.
	let chartReady = $state(false);

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

	// SSR-rendered fallback: a static SVG profile of the whole track so no-JS
	// (and pre-hydration) users see the elevation graph immediately. Path
	// coordinates live in an 800×200 viewBox; `preserveAspectRatio="none"`
	// stretches the path to fill the box on any aspect ratio. Strokes use
	// `vector-effect: non-scaling-stroke` so the line weight stays at a
	// constant pixel weight regardless of the stretch. Once Chart.js mounts
	// and paints, the SVG fades out and the interactive canvas takes over.
	const FALLBACK_VB_W = 800;
	const FALLBACK_VB_H = 200;
	const elevFallback = $derived.by(() => {
		if (track.length < 2) return { fill: '', line: '' };
		// Per-track sample cap so a ~5 000-point GPX doesn't produce a 60 KB
		// SVG path in the HTML. ~600 samples is enough for a smooth profile
		// at typical display widths and keeps the inline SVG around ~6 KB.
		const target = 600;
		const step = Math.max(1, Math.floor(track.length / target));

		let altLo = Infinity;
		let altHi = -Infinity;
		for (let i = 0; i < track.length; i++) {
			const a = track[i][2];
			if (typeof a === 'number') {
				if (a < altLo) altLo = a;
				if (a > altHi) altHi = a;
			}
		}
		if (!Number.isFinite(altLo)) return { fill: '', line: '' };

		const maxKm = cumKm[cumKm.length - 1];
		if (!maxKm) return { fill: '', line: '' };

		// No vertical pad: the path needs to touch the top/bottom of the
		// plot exactly, otherwise the HTML axis labels (min/max altitude)
		// drawn next to the SVG won't line up with the actual peak/trough.
		const yMin = altLo;
		const ySpread = altHi - altLo || 1;

		let line = '';
		let firstX: number | null = null;
		let lastX: number | null = null;
		const append = (i: number) => {
			const a = track[i][2];
			if (typeof a !== 'number') return;
			const x = (cumKm[i] / maxKm) * FALLBACK_VB_W;
			const y = (1 - (a - yMin) / ySpread) * FALLBACK_VB_H;
			if (firstX === null) {
				firstX = x;
				line = `M${x.toFixed(1)} ${y.toFixed(1)}`;
			} else {
				line += `L${x.toFixed(1)} ${y.toFixed(1)}`;
			}
			lastX = x;
		};
		for (let i = 0; i < track.length; i += step) append(i);
		// Always include the last sample so the trace runs to maxKm.
		if ((track.length - 1) % step !== 0) append(track.length - 1);
		if (firstX === null || lastX === null) return { fill: '', line: '' };
		const fill = `${line}L${lastX.toFixed(1)} ${FALLBACK_VB_H}L${firstX.toFixed(1)} ${FALLBACK_VB_H}Z`;
		return { fill, line };
	});

	// Axis ticks for the SSR fallback: five values per axis (start, three
	// intermediates, end) so each axis reads as a properly-scaled chart,
	// not just labelled at the bookends. y-ticks are emitted top-to-bottom
	// so the first label = max altitude, matching the SVG's y=0-at-top
	// coordinate system. The three intermediate y-tick fractions (0.75,
	// 0.5, 0.25) double as the soft helpline positions inside the plot,
	// expressed as `viewBox` y-offsets below.
	const elevFallbackKm = $derived(cumKm[cumKm.length - 1] ?? 0);

	const elevFallbackYTicks = $derived.by(() => {
		let lo = Infinity;
		let hi = -Infinity;
		for (let i = 0; i < track.length; i++) {
			const a = track[i][2];
			if (typeof a === 'number') {
				if (a < lo) lo = a;
				if (a > hi) hi = a;
			}
		}
		if (!Number.isFinite(lo)) return null;
		const min = Math.round(lo);
		const max = Math.round(hi);
		const span = max - min;
		return [
			max,
			Math.round(min + span * 0.75),
			Math.round(min + span * 0.5),
			Math.round(min + span * 0.25),
			min
		];
	});

	const elevFallbackXTicks = $derived.by(() => {
		const max = elevFallbackKm;
		if (!max) return [];
		return [0, max * 0.25, max * 0.5, max * 0.75, max];
	});

	// Horizontal helpline positions inside the SVG (viewBox y-coords).
	// Only the three intermediates — the top and bottom of the plot are
	// already framed by the filled area's edge, so adding gridlines there
	// would just be visual noise.
	const ELEV_FALLBACK_GRID_Y = [
		FALLBACK_VB_H * 0.25,
		FALLBACK_VB_H * 0.5,
		FALLBACK_VB_H * 0.75
	];

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

		// Flip the SSR-fallback flag synchronously with chart creation so the
		// next paint already shows the canvas underneath the fading SVG.
		// Set inside `createChart` (not only in `onMount`) so theme rebuilds
		// don't briefly flash the SVG back; the flag is one-way (never reset).
		chartReady = true;
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
	<!-- Static SVG profile rendered server-side so no-JS readers (and JS
	     users pre-hydration) see the elevation graph without waiting on
	     Chart.js. The grid lays out the axis gutters (y-title + y-ticks
	     on the left, x-ticks + x-title under) so the SVG plot occupies
	     the same content region Chart.js will use for its chart area.
	     Once the canvas chart paints, this layer fades out and
	     `pointer-events: none` cedes hover to the interactive chart. -->
	<div class="elev-fallback" class:hidden={chartReady} aria-hidden="true">
		<div class="y-title">Höhe (m)</div>
		<ol class="y-ticks">
			{#if elevFallbackYTicks}
				{#each elevFallbackYTicks as v (v)}
					<li>{v}</li>
				{/each}
			{/if}
		</ol>
		<svg
			class="elev-fallback-svg"
			viewBox="0 0 {FALLBACK_VB_W} {FALLBACK_VB_H}"
			preserveAspectRatio="none"
		>
			<!-- Soft helplines, one per intermediate y-tick. `non-scaling-
			     stroke` keeps them at 1 px even when the SVG is stretched
			     horizontally by `preserveAspectRatio="none"`. -->
			<g class="elev-fallback-grid">
				{#each ELEV_FALLBACK_GRID_Y as gy (gy)}
					<line
						x1="0"
						y1={gy}
						x2={FALLBACK_VB_W}
						y2={gy}
						vector-effect="non-scaling-stroke"
					/>
				{/each}
			</g>
			{#if elevFallback.fill}
				<path d={elevFallback.fill} class="elev-fallback-fill" />
				<path
					d={elevFallback.line}
					class="elev-fallback-line"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		</svg>
		<ol class="x-ticks">
			{#each elevFallbackXTicks as v (v)}
				<li>{v.toFixed(1)}</li>
			{/each}
		</ol>
		<div class="x-title">Distanz (km)</div>
	</div>
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
		position: relative;
		z-index: 2;
	}

	/* SSR fallback grid: y-title (rotated) + y-ticks form the left gutter,
	 * x-ticks + x-title form the bottom gutter, the SVG plot fills the
	 * remaining cell. Sized with `calc(100% - 2*padding)` rather than the
	 * top/right/bottom/left-inset shortcut, because `<svg>` is a replaced
	 * element with an intrinsic aspect ratio from `viewBox` that some
	 * browsers let win over a `bottom` constraint — the full-width 220 px
	 * chart was spilling past its rounded box at the bottom.
	 *
	 * The canvas sits on top (z-index 2) so once Chart.js paints, its
	 * scene fully covers this fallback; we still fade the fallback out so
	 * any anti-aliased edge gaps don't leak through. */
	.elev-fallback {
		position: absolute;
		top: 0.75rem;
		left: 1rem;
		width: calc(100% - 2rem);
		height: calc(100% - 1.5rem);
		z-index: 1;
		opacity: 1;
		transition: opacity 250ms ease;
		pointer-events: none;
		display: grid;
		grid-template-columns: 0.85rem 2rem 1fr;
		grid-template-rows: 1fr 0.9rem 0.9rem;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.elev-fallback.hidden {
		opacity: 0;
	}

	.y-title {
		grid-row: 1;
		grid-column: 1;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		text-align: center;
		align-self: center;
		justify-self: center;
		color: var(--color-text-secondary);
		letter-spacing: 0.01em;
	}

	/* Y-ticks reset list defaults so they read as plain labels. `space-
	 * between` aligns the first/last items with the plot's top/bottom
	 * edges — same Y-range the SVG path uses (no altitude padding), so
	 * the topmost label sits on the highest peak and the bottom one at
	 * the lowest trough. */
	.y-ticks {
		grid-row: 1;
		grid-column: 2;
		margin: 0;
		padding: 0 0.3rem 0 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-end;
		line-height: 1;
	}

	.y-ticks li::after {
		content: ' m';
		opacity: 0.55;
	}

	.elev-fallback-svg {
		grid-row: 1;
		grid-column: 3;
		width: 100%;
		height: 100%;
	}

	/* X-ticks: 0 / mid / max, evenly distributed along the bottom of the
	 * plot so they line up with the SVG's left edge, midpoint, and right
	 * edge respectively. */
	.x-ticks {
		grid-row: 2;
		grid-column: 3;
		margin: 0;
		padding: 0.15rem 0 0;
		list-style: none;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		line-height: 1;
	}

	.x-title {
		grid-row: 3;
		grid-column: 3;
		text-align: center;
		color: var(--color-text-secondary);
		letter-spacing: 0.01em;
		line-height: 1;
		padding-top: 0.05rem;
	}

	.elev-fallback-grid line {
		stroke: currentColor;
		stroke-width: 1;
		opacity: 0.15;
	}

	.elev-fallback-fill {
		fill: var(--color-primary);
		fill-opacity: 0.18;
	}

	.elev-fallback-line {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>
