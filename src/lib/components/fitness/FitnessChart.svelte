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
	 *   yWidthGroup?: import('$lib/stores/axisWidthGroup.svelte').AxisWidthGroup,
	 *   zoom?: boolean,
	 *   applyXRange?: { min: number, max: number } | null,
	 *   onXRangeChange?: (range: { min: number, max: number }) => void
	 * }}
	 *
	 * `zoom` enables wheel / pinch / drag pan-zoom constrained to the x-axis (used
	 * by the body-trend detail view). `onXRangeChange` reports the new x min/max
	 * after a user gesture, and `applyXRange` programmatically sets the visible
	 * window — together they let a parent keep two stacked charts on one shared
	 * time range. Programmatic `applyXRange` updates don't re-fire `onXRangeChange`,
	 * so syncing the two can't loop.
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
	let { type = 'line', data, title = '', height = '250px', yUnit = '', goalLine = undefined, tooltipFormatter = undefined, yMin = undefined, yMax = undefined, onHover = undefined, hoverIndex = undefined, xAxis = undefined, yWidthGroup = undefined, zoom = false, applyXRange = undefined, onXRangeChange = undefined } = $props();

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

	/** Normalise a CSS colour to "r,g,b" (alpha dropped) so a faded σ-band fill
	 *  matches the solid line it shades, regardless of hex vs rgba() notation. */
	function rgbKey(/** @type {any} */ c) {
		if (typeof c !== 'string') return '';
		const hex = c.match(/^#([0-9a-f]{3,8})$/i);
		if (hex) {
			let h = hex[1];
			h = h.length < 6 ? h.slice(0, 3).split('').map((x) => x + x).join('') : h.slice(0, 6);
			const n = parseInt(h, 16);
			return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
		}
		const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
		return rgb ? `${+rgb[1]},${+rgb[2]},${+rgb[3]}` : '';
	}

	// Strip floating-point drift from an axis tick value so labels read cleanly
	// (Chart.js can hand back e.g. 4.6000000000000005 for a 0.1 step). Non-numeric
	// values (category labels) pass through untouched.
	function cleanTick(/** @type {any} */ v) {
		const n = Number(v);
		return Number.isFinite(n) ? +n.toFixed(6) : v;
	}

	// HTML colour key. A σ-band ("± 1σ") isn't a series of its own — it shades a
	// line — so instead of a separate swatchless legend entry, its label is folded
	// onto that line ("Trend ± 1σ"), matched by base colour. Shown only when ≥2
	// visibly-distinct series exist, matching the old canvas legend's condition.
	const legend = $derived.by(() => {
		const datasets = data?.datasets || [];
		const entries = datasets
			.map((/** @type {any} */ d, /** @type {number} */ i) => {
				const isBand = d.borderColor === 'transparent' || (d.label ?? '').includes('σ');
				return {
					label: d.label ?? '',
					color: isBand ? null : d.borderColor || nordColors[i % nordColors.length],
					bandKey: isBand ? rgbKey(d.backgroundColor) : '',
					isBand,
					lower: (d.label ?? '').includes('(lower)')
				};
			})
			.filter((e) => !e.lower);

		// band base-colour → its label ("± 1σ"), to suffix onto the matching line.
		const suffix = new Map();
		for (const e of entries) if (e.isBand && e.bandKey && e.label) suffix.set(e.bandKey, e.label);

		const lines = entries.filter((e) => !e.isBand && e.color);
		const items = lines.map((l) => {
			const s = suffix.get(rgbKey(l.color));
			return { label: s ? `${l.label} ${s}` : l.label, color: l.color };
		});
		const colors = new Set(lines.map((l) => l.color));
		return { show: lines.length > 1 && colors.size > 1, items };
	});

	// ── Custom x-axis pan / pinch / wheel (zoom mode) ──────────────────────────
	// We drive the visible x window directly (chart.options.scales.x.min/max)
	// rather than through a zoom plugin: a drag pans it, a pinch or wheel scales
	// it around the gesture's focal point. Fully under our control, no extra deps.
	let applyingXRange = false;        // guard so external sync doesn't echo back out
	let fullMin = 0;                   // data extent (epoch ms) — the pan/zoom limits
	let fullMax = 0;
	const MIN_SPAN_MS = 2 * 86_400_000; // never zoom tighter than ~2 days

	/** Clamp a requested window to the data extent and a minimum span.
	 *  @param {number} min @param {number} max */
	function clampWindow(min, max) {
		const fullSpan = fullMax - fullMin;
		let span = max - min;
		if (fullSpan > 0) span = Math.min(span, fullSpan);
		span = Math.max(span, MIN_SPAN_MS);
		const center = (min + max) / 2;
		let lo = center - span / 2;
		let hi = center + span / 2;
		if (lo < fullMin) { lo = fullMin; hi = lo + span; }
		if (hi > fullMax) { hi = fullMax; lo = hi - span; }
		if (lo < fullMin) lo = fullMin;
		return { min: lo, max: hi };
	}

	/** Refit y to the data inside [xMin,xMax] so a zoomed slice fills the height.
	 *  @param {number} xMin @param {number} xMax */
	function autofitY(xMin, xMax) {
		const c = chart;
		const ys = /** @type {any} */ (c?.options?.scales?.y);
		if (!c || !ys) return;
		let lo = Infinity;
		let hi = -Infinity;
		for (const ds of c.data.datasets) {
			for (const pt of /** @type {any[]} */ (ds.data)) {
				if (pt == null) continue;
				const y = typeof pt === 'object' ? pt.y : pt;
				if (y == null || !Number.isFinite(y)) continue;
				if (typeof pt === 'object' && pt.x != null) {
					const xv = new Date(pt.x).getTime();
					if (Number.isFinite(xv) && (xv < xMin || xv > xMax)) continue;
				}
				if (y < lo) lo = y;
				if (y > hi) hi = y;
			}
		}
		if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
		const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
		ys.min = lo - pad;
		ys.max = hi + pad;
	}

	/** Apply an x window: clamp, set the axis, refit y, redraw, optionally report.
	 *  @param {number} min @param {number} max @param {boolean} report */
	function setXWindow(min, max, report) {
		const c = chart;
		if (!c) return;
		const w = clampWindow(min, max);
		const xOpts = /** @type {any} */ (c.options).scales.x;
		xOpts.min = w.min;
		xOpts.max = w.max;
		autofitY(w.min, w.max);
		// Animated update: x is pinned to duration 0 (pan/zoom track the gesture
		// instantly) while y eases to its new range (see `animations` in createChart).
		c.update();
		if (report && onXRangeChange && !applyingXRange) onXRangeChange({ min: w.min, max: w.max });
	}

	/** The current visible window (full extent before any gesture). */
	function currentWindow() {
		const x = /** @type {any} */ (chart?.options?.scales?.x);
		const min = Number.isFinite(x?.min) ? Number(x.min) : fullMin;
		const max = Number.isFinite(x?.max) ? Number(x.max) : fullMax;
		return { min, max };
	}

	// Active touch/mouse pointers (id → clientX) for pan + pinch.
	/** @type {Map<number, number>} */
	const activePointers = new Map();
	let pinchPrevDist = 0;

	/** chartArea left/width in CSS px (the plotted region). */
	function plotLeftWidth() {
		const area = chart?.chartArea;
		return { left: area?.left ?? 0, width: (area?.width || canvas?.clientWidth) ?? 1 };
	}

	/** @param {PointerEvent} e */
	function onPointerDown(e) {
		if (!zoom || !chart) return;
		try { canvas?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
		activePointers.set(e.pointerId, e.clientX);
		if (activePointers.size === 2) {
			const xs = [...activePointers.values()];
			pinchPrevDist = Math.abs(xs[0] - xs[1]) || 1;
		}
	}

	/** @param {PointerEvent} e */
	function onPointerMove(e) {
		const cv = canvas;
		if (!zoom || !chart || !cv || !activePointers.has(e.pointerId)) return;
		const prevX = activePointers.get(e.pointerId) ?? e.clientX;
		activePointers.set(e.pointerId, e.clientX);
		const rect = cv.getBoundingClientRect();
		const { left, width } = plotLeftWidth();
		const { min, max } = currentWindow();
		const span = max - min;
		if (activePointers.size === 1) {
			// Pan: shift the window opposite the finger so content tracks the drag.
			const dValue = -((e.clientX - prevX) / width) * span;
			setXWindow(min + dValue, max + dValue, true);
		} else if (activePointers.size === 2) {
			// Pinch: scale the span by the change in finger distance, anchored at
			// the time under the gesture's midpoint so it stays put.
			const xs = [...activePointers.values()];
			const curDist = Math.abs(xs[0] - xs[1]) || 1;
			const midPx = (xs[0] + xs[1]) / 2 - rect.left;
			const anchor = min + ((midPx - left) / width) * span;
			const newSpan = span * (pinchPrevDist / curDist);
			pinchPrevDist = curDist;
			const newMin = anchor - ((midPx - left) / width) * newSpan;
			setXWindow(newMin, newMin + newSpan, true);
		}
	}

	/** @param {PointerEvent} e */
	function onPointerUp(e) {
		activePointers.delete(e.pointerId);
		if (activePointers.size === 2) {
			const xs = [...activePointers.values()];
			pinchPrevDist = Math.abs(xs[0] - xs[1]) || 1;
		}
	}

	/** @param {WheelEvent} e */
	function onWheel(e) {
		const cv = canvas;
		if (!zoom || !chart || !cv) return;
		e.preventDefault();
		const rect = cv.getBoundingClientRect();
		const { left, width } = plotLeftWidth();
		const { min, max } = currentWindow();
		const span = max - min;
		const px = e.clientX - rect.left;
		const anchor = min + ((px - left) / width) * span;
		const newSpan = span * (e.deltaY > 0 ? 1.15 : 1 / 1.15);
		const newMin = anchor - ((px - left) / width) * newSpan;
		setXWindow(newMin, newMin + newSpan, true);
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
				// Zoom charts: pin x to instant (pan/zoom track the gesture 1:1) but
				// ease y so the auto-fitted range glides instead of snapping.
				animations: zoom ? /** @type {any} */ ({
					x: { duration: 0 },
					y: { duration: 300, easing: 'easeOutQuart' }
				}) : undefined,
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
								const label = tk.label ?? `${cleanTick(scale.getLabelForValue(tk.value))}${yUnit}`;
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
							callback: (/** @type {any} */ v) => `${cleanTick(v)}${yUnit}`
						}
					}
				},
				plugins: /** @type {any} */ ({
					legend: {
						display: false, // colour key is rendered as HTML below (see `legend` derived)
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

		// Cache the data extent (epoch ms) — the limits for pan/zoom gestures.
		if (zoom && dates.length) {
			const stamps = dates.map((d) => new Date(d).getTime()).filter((n) => Number.isFinite(n));
			if (stamps.length) {
				fullMin = Math.min(...stamps);
				fullMax = Math.max(...stamps);
			}
		}
	}

	onMount(() => {
		let disposed = false;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => setTimeout(createChart, 100);
		/** @type {MutationObserver | undefined} */
		let obs;

		// Pan/pinch/wheel gesture wiring (zoom mode only). Pointer events cover
		// mouse-drag, touch-drag and multi-touch pinch; wheel zooms on desktop.
		if (zoom && canvas) {
			canvas.addEventListener('pointerdown', onPointerDown);
			canvas.addEventListener('pointermove', onPointerMove);
			canvas.addEventListener('pointerup', onPointerUp);
			canvas.addEventListener('pointercancel', onPointerUp);
			canvas.addEventListener('pointerleave', onPointerUp);
			canvas.addEventListener('wheel', onWheel, { passive: false });
		}

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
			if (zoom && canvas) {
				canvas.removeEventListener('pointerdown', onPointerDown);
				canvas.removeEventListener('pointermove', onPointerMove);
				canvas.removeEventListener('pointerup', onPointerUp);
				canvas.removeEventListener('pointercancel', onPointerUp);
				canvas.removeEventListener('pointerleave', onPointerUp);
				canvas.removeEventListener('wheel', onWheel);
			}
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

	// Apply an externally-driven x window (the sibling chart's range, or a restore
	// after a theme-triggered chart rebuild). Guarded so it doesn't echo back out
	// through onXRangeChange.
	$effect(() => {
		const r = applyXRange;
		if (!chart || !zoom || r == null) return;
		const cur = currentWindow();
		// Already showing this window (e.g. the chart that originated the gesture) —
		// skip to avoid an echo back through onXRangeChange.
		if (Math.abs(cur.min - r.min) < 1000 && Math.abs(cur.max - r.max) < 1000) return;
		applyingXRange = true;
		setXWindow(r.min, r.max, false);
		applyingXRange = false;
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
	<div class="chart-canvas-wrap">
		<canvas bind:this={canvas} class:zoomable={zoom}></canvas>
	</div>
	{#if legend.show}
		<div class="chart-legend">
			{#each legend.items as it (it.label)}
				<span class="legend-item">
					<span class="legend-swatch" style:background-color={it.color}></span>
					<span class="legend-text">{it.label}</span>
				</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chart-container {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
		border: 1px solid var(--color-border);
	}
	.chart-canvas-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.2rem 1rem;
		padding-top: 0.6rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.legend-swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	canvas {
		max-width: 100%;
		height: 100% !important;
	}
	/* Let our own pointer handlers own every touch gesture (drag = pan,
	   two-finger = pinch). Without this the browser scrolls / page-zooms and
	   cancels the pointer stream mid-gesture. */
	canvas.zoomable {
		touch-action: none;
	}
</style>
