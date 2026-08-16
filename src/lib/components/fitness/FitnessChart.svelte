<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	/**
	 * @type {{
	 *   type?: 'line' | 'bar',
	 *   data: { labels?: string[], dates?: string[], datasets: Array<{ label: string, data: Array<number|null|{ x: number, y: number|null }>, borderColor?: string, backgroundColor?: string|string[], borderWidth?: number, pointRadius?: number, pointBackgroundColor?: string, tension?: number, fill?: boolean|string, order?: number, type?: string, borderDash?: number[], [key: string]: any }> },
	 *   title?: string,
	 *   height?: string,
	 *   yUnit?: string,
	 *   y2Unit?: string,
	 *   yDecimals?: number,
	 *   y2Decimals?: number,
	 *   y2WidthGroup?: import('$lib/stores/axisWidthGroup.svelte').AxisWidthGroup,
	 *   goalLine?: number,
	 *   tooltipFormatter?: (value: number, datasetIndex: number, dataIndex: number, label: string) => string,
	 *   tooltipLabelColor?: (value: number, datasetIndex: number, dataIndex: number) => string,
	 *   yMin?: number,
	 *   yMax?: number,
	 *   yAxis?: { min: number, max: number, stepSize: number },
	 *   yTickFormatter?: (value: number) => string,
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
	 * A dataset carrying `yAxisID: 'y2'` is measured against a second y-axis drawn
	 * on the right, labelled with `y2Unit` (used to overlay body weight on the
	 * protein-per-day bars). Both axes get the same number of ticks, so the two
	 * scales share one set of gridlines instead of drawing a confusing double grid.
	 * `y2WidthGroup` is the right-hand counterpart of `yWidthGroup`: charts with a
	 * right axis report its width, and stacked charts *without* one reserve the
	 * group's width as blank space, so every plot area in the stack ends at the
	 * same x too.
	 *
	 * `yAxis` pins the y-axis outright — limits *and* gridline step — instead of
	 * letting Chart.js fit it to the data. The GPS charts use it to keep a minimum
	 * y extent: a run held at a steady pace varies by a couple of seconds per km,
	 * and an auto-fitted axis magnifies that noise into a dramatic-looking graph.
	 * `yTickFormatter` then labels those ticks (pace as `M:SS`, not `6.25`).
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
	let { type = 'line', data, title = '', height = '250px', yUnit = '', y2Unit = '', yDecimals = undefined, y2Decimals = undefined, goalLine = undefined, tooltipFormatter = undefined, tooltipLabelColor = undefined, yMin = undefined, yMax = undefined, yAxis = undefined, yTickFormatter = undefined, onHover = undefined, hoverIndex = undefined, xAxis = undefined, yWidthGroup = undefined, y2WidthGroup = undefined, zoom = false, applyXRange = undefined, onXRangeChange = undefined } = $props();

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

	// Tick count shared by the left and right y-axes when a chart has both, so the two
	// scales land on one set of gridlines instead of drawing a double grid. It is a
	// starting point: a zoom chart recomputes the count from its data (see autofitY),
	// which is what keeps the steps fine-grained.
	const Y_TICK_COUNT = 6;
	// Ceiling on gridline gaps, i.e. on how coarse the step may get. Bounding the gaps
	// rather than the tick count is deliberate: with a fixed 6 ticks, a 0–220 g series
	// has to jump to 100 g steps, where allowing more gridlines keeps it on 25 g.
	const MAX_Y_INTERVALS = 10;
	// How far past the left/right plot edges a dataset may paint, so a point sitting
	// on the x limit is drawn as a full circle instead of a half one. Covers the
	// hovered radius (4) plus its border.
	const EDGE_CLIP_PAD = 6;
	// Touch has no "pointer left the chart" event, so a tap-and-drag leaves the
	// tooltip and cursor stuck on screen. Dismiss them shortly after the finger
	// lifts — long enough to read the value, short enough not to linger.
	const TOUCH_DISMISS_MS = 500;

	/** Candidate gridline steps from `from` upward: 1, 2, 2.5, 5 × a power of ten.
	 *  @param {number} from @param {number} i */
	function niceStep(from, i) {
		const mults = [1, 2, 2.5, 5];
		const baseMag = Math.pow(10, Math.floor(Math.log10(from)));
		return mults[i % mults.length] * baseMag * Math.pow(10, Math.floor(i / mults.length));
	}

	/** Round [lo,hi] outward until it divides into exactly `count - 1` steps of a
	 *  readable size. Used for a secondary axis, which has to take the tick count the
	 *  primary one settled on so their gridlines coincide.
	 *  @param {number} lo @param {number} hi @param {number} count */
	function niceRange(lo, hi, count) {
		const intervals = Math.max(1, count - 1);
		const raw = (hi - lo) / intervals;
		if (!Number.isFinite(raw) || raw <= 0) return { min: lo, max: hi, intervals };
		for (let i = 0; i < 4 * 8; i++) {
			const step = niceStep(raw, i);
			const min = Math.floor(lo / step + 1e-9) * step;
			const max = min + step * intervals;
			if (max >= hi - 1e-9) return { min, max, intervals };
		}
		return { min: lo, max: hi, intervals };
	}

	/** Fit [lo,hi] onto readable gridlines using at most `maxIntervals` gaps: the
	 *  smallest nice step that covers the range within that many. Unlike niceRange the
	 *  tick count comes out of the fit rather than being imposed on it, so the step
	 *  stays as fine as the gap budget allows.
	 *  @param {number} lo @param {number} hi @param {number} maxIntervals */
	function niceFit(lo, hi, maxIntervals) {
		const span = hi - lo;
		if (!Number.isFinite(span) || span <= 0) return { min: lo, max: hi, intervals: 1 };
		for (let i = 0; i < 4 * 8; i++) {
			const step = niceStep(span / maxIntervals, i);
			const min = Math.floor(lo / step + 1e-9) * step;
			const intervals = Math.max(1, Math.ceil((hi - min) / step - 1e-9));
			if (intervals <= maxIntervals) return { min, max: min + step * intervals, intervals };
		}
		return { min: lo, max: hi, intervals: maxIntervals };
	}

	/** Axis tick label: fixed to `decimals` places when the caller pins a precision
	 *  (whole grams, tenths of a kilo), otherwise just de-noised.
	 *  @param {any} v @param {number|undefined} decimals @param {string} unit */
	function tickLabel(v, decimals, unit) {
		const n = Number(v);
		if (decimals != null && Number.isFinite(n)) return `${n.toFixed(decimals)}${unit}`;
		return `${cleanTick(v)}${unit}`;
	}

	/** Left-axis tick label. A caller-supplied formatter wins over the unit +
	 *  decimals pair, so a pace axis can read `6:15` instead of `6.25`.
	 *  @param {any} v */
	function yTickLabel(v) {
		const n = Number(v);
		if (yTickFormatter && Number.isFinite(n)) return yTickFormatter(n);
		return tickLabel(v, yDecimals, yUnit);
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

	// ── Skeleton drawn until Chart.js has loaded ──────────────────────────────
	// Chart.js is imported on mount, so a chart is an empty box for as long as that
	// chunk takes to arrive — that is the pop-in. The data is already in the page,
	// so the series can be drawn as plain SVG/HTML in the meantime; the only cost
	// in the SSR'd HTML is the path string.
	//
	// A ghost only helps if it lands where the real chart will, so:
	//   • the y range comes from Chart.js's own linear-tick algorithm (niceNum plus
	//     the floor/ceil spacing dance, cloned from scale.linear.js) rather than the
	//     raw data extent — the two differ by 10-20% of the height, which is most of
	//     the "shift" you'd otherwise see;
	//   • the plot-area gutters are *remembered* from the last time a chart with the
	//     same shape was drawn (see calKey). Reproducing Chart.js's box layout would
	//     mean reimplementing it; measuring the real thing once is exact and cheap.
	//     The first ever paint uses estimates, every later one is pixel-accurate.
	const TICK_LINE_HEIGHT = 13.2; // 11px tick font × Chart.js's default 1.2 line height
	const MAX_TICKS_LIMIT = 11;    // Chart.js's default when no stepSize is set
	const SKELETON_POINTS = 120;   // cap on ghost samples, so the HTML stays small

	/** Remembered plot-area gutters in px, or null before the first measurement. */
	let cal = $state(/** @type {{ l: number, t: number, r: number, b: number } | null} */ (null));

	/** @param {number} n */
	function r1(n) {
		return +n.toFixed(1);
	}

	// The pages pick this one colour per theme (nord10 light / nord8 dark) and hand
	// it in as a hex — but the skeleton is server-rendered, where the theme is
	// unknowable, so it would render the light blue on a dark page until hydration.
	// Hand those two back to the CSS variable that already switches. Every other
	// colour in the palette (green, purple, orange) is theme-independent and is
	// passed through exactly.
	const PRIMARY_RGB = ['94,129,172', '136,192,208'];

	/** @param {any} c */
	function ghostColor(c) {
		if (typeof c !== 'string' || !PRIMARY_RGB.includes(rgbKey(c))) return c;
		const alpha = Number(c.match(/rgba\([^)]*,\s*([\d.]+)\s*\)/)?.[1] ?? 1);
		return alpha >= 1
			? 'var(--color-primary)'
			: `color-mix(in srgb, var(--color-primary) ${Math.round(alpha * 100)}%, transparent)`;
	}

	/** chart.js `helpers.math.niceNum` — the 1/2/5/10 × 10ⁿ step family. @param {number} range */
	function cjsNiceNum(range) {
		const rounded = Math.round(range);
		const r = Math.abs(range - rounded) < range / 1000 ? rounded : range;
		const mag = Math.pow(10, Math.floor(Math.log10(r)));
		const f = r / mag;
		return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
	}

	/** chart.js `scale.linear` tick generation for the plain case we use (bounds
	 *  'ticks', no explicit min/max/precision). Returns the axis range it settles on.
	 *  @param {number} lo @param {number} hi @param {number} maxTicks @param {number|undefined} stepSize */
	function cjsTickRange(lo, hi, maxTicks, stepSize) {
		const unit = stepSize || 1;
		const maxSpaces = Math.max(1, maxTicks - 1);
		let spacing = cjsNiceNum((hi - lo) / maxSpaces / unit) * unit;
		if (!Number.isFinite(spacing) || spacing <= 0) return { min: lo, max: hi, values: [lo, hi] };
		const spaces = Math.ceil(hi / spacing) - Math.floor(lo / spacing);
		if (spaces > maxSpaces) spacing = cjsNiceNum((spaces * spacing) / maxSpaces / unit) * unit;
		const min = Math.floor(lo / spacing) * spacing;
		const max = Math.ceil(hi / spacing) * spacing;
		const count = Math.max(1, Math.round((max - min) / spacing));
		const values = [];
		// Same rounding Chart.js applies, so a 0.1 step doesn't print float drift.
		const factor = Math.pow(10, Math.max(0, -Math.floor(Math.log10(spacing)) + 1));
		for (let i = 0; i <= count; i++) values.push(Math.round((min + i * spacing) * factor) / factor);
		return { min, max, values };
	}

	const skeleton = $derived.by(() => {
		const sets = data?.datasets || [];
		if (!sets.length) return null;

		/** @type {{ color: string, bar: boolean, width: number, dot: number, dotColor: string, values: any[] }[]} */
		const series = [];
		/** @type {any[] | null} */
		let bandUpper = null;
		/** @type {any[] | null} */
		let bandLower = null;
		let bandColor = '';
		sets.forEach((/** @type {any} */ d, /** @type {number} */ i) => {
			// A second axis is in its own units; it can't share this normalisation.
			if (d.yAxisID === 'y2') return;
			const label = d.label ?? '';
			const values = (d.data || []).map((/** @type {any} */ p) => (p != null && typeof p === 'object' ? p.y : p));
			if (label.includes('σ')) {
				bandUpper = values;
				bandColor = ghostColor(Array.isArray(d.backgroundColor) ? d.backgroundColor[0] : d.backgroundColor);
				return;
			}
			if (label.includes('(lower)')) {
				bandLower = values;
				return;
			}
			const bar = d.type === 'bar' || (type === 'bar' && !d.type);
			const stroke = (bar ? (Array.isArray(d.backgroundColor) ? d.backgroundColor[0] : d.backgroundColor) : d.borderColor) || d.borderColor || nordColors[i % nordColors.length];
			series.push({
				color: ghostColor(stroke),
				bar,
				width: d.borderWidth ?? 2,
				// Same default the real chart uses: 3px dots on a line, none on bars.
				dot: d.pointRadius ?? (bar ? 0 : 3),
				dotColor: ghostColor(d.pointBackgroundColor || stroke),
				values
			});
		});
		if (!series.length) return null;

		// ── y range, as Chart.js will compute it ───────────────────────────────
		const allValues = [...series.map((s) => s.values), bandUpper, bandLower].filter(Boolean);
		let lo = Infinity;
		let hi = -Infinity;
		for (const arr of /** @type {any[][]} */ (allValues)) {
			for (const v of arr) {
				if (typeof v !== 'number' || !Number.isFinite(v)) continue;
				if (v < lo) lo = v;
				if (v > hi) hi = v;
			}
		}
		if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
		if (yMin != null) lo = Math.min(lo, yMin);
		if (yMax != null) hi = Math.max(hi, yMax);
		// handleTickRangeOptions: beginAtZero (bars) pulls the range to the baseline.
		const isBar = type === 'bar';
		if (isBar) {
			if (lo > 0 && hi > 0) lo = 0;
			else if (lo < 0 && hi < 0) hi = 0;
		}
		if (lo === hi) {
			const offset = hi === 0 ? 1 : Math.abs(hi * 0.05);
			hi += offset;
			if (!isBar) lo -= offset;
		}

		// Mirrors the integer step createChart asks for on small count charts.
		const barValues = isBar
			? /** @type {any[]} */ (allValues.flat()).filter((v) => typeof v === 'number' && Number.isFinite(v))
			: [];
		const barPeak = Math.max(0, ...barValues.map((v) => Math.abs(v)));
		const stepSize = isBar && barPeak <= 12 && barValues.every((v) => Number.isInteger(v)) ? 1 : undefined;
		const hasY2 = sets.some((/** @type {any} */ d) => d.yAxisID === 'y2');

		// Gutter estimate, also used for the tick-count fit so the ticks don't move
		// once a measured calibration arrives.
		const boxH = parseFloat(height) || 250;
		const estTop = (title ? 29 : 0) + 10;
		const estBottom = 20;
		const plotH = Math.max(40, boxH - 32 - estTop - estBottom); // 32 = container padding
		const maxTicks = Math.max(2, stepSize
			? Math.ceil(hi / stepSize) - Math.floor(lo / stepSize) + 1
			: Math.min(MAX_TICKS_LIMIT, Math.ceil(plotH / TICK_LINE_HEIGHT)));
		// A pinned axis skips the fit entirely — its ticks are already decided.
		const range = yAxis
			? {
				min: yAxis.min,
				max: yAxis.max,
				values: Array.from(
					{ length: Math.max(1, Math.round((yAxis.max - yAxis.min) / yAxis.stepSize)) + 1 },
					(_, i) => yAxis.min + i * yAxis.stepSize
				)
			}
			: cjsTickRange(lo, hi, maxTicks, stepSize);
		// A second axis pins both sides to a fixed tick count (see createChart).
		const tickValues = hasY2
			? Array.from({ length: 6 }, (_, i) => range.min + ((range.max - range.min) * i) / 5)
			: range.values;
		const labels = tickValues.map((v) => String(yTickLabel(v)));
		const widest = Math.max(1, ...labels.map((l) => l.length));

		const gut = cal ?? {
			// 8px tick mark + 2×3px tick padding + the widest label at ~6.1px/char.
			l: Math.round(14 + widest * 6.1),
			t: estTop,
			// Half of the last x-axis label spills past the plot on a date/linear axis.
			r: hasY2 ? Math.round(14 + widest * 6.1) : 16,
			b: estBottom
		};

		// ── x positions ────────────────────────────────────────────────────────
		const n = Math.max(...(/** @type {any[][]} */ (allValues)).map((a) => a.length));
		if (!n) return null;
		const dates = data.dates || [];
		/** Raw x values when the axis is numeric (linear) or time. */
		const xRaw = xAxis
			? (sets.find((/** @type {any} */ d) => Array.isArray(d.data) && typeof d.data[0] === 'object')?.data || []).map((/** @type {any} */ p) => p?.x)
			: dates.length
				? dates.map((/** @type {string} */ d) => new Date(d).getTime())
				: null;
		let xLo = 0;
		let xHi = 1;
		if (xRaw) {
			const nums = xRaw.filter((/** @type {any} */ v) => Number.isFinite(v));
			xLo = xAxis ? xAxis.min : Math.min(...nums);
			xHi = xAxis ? xAxis.max : Math.max(...nums);
		}
		/** @param {number} i */
		const xAt = (i) => {
			if (xRaw && xHi > xLo) return ((xRaw[i] - xLo) / (xHi - xLo)) * 100;
			// Category axis: bars sit in the middle of their band, lines on the edges.
			if (isBar) return ((i + 0.5) / n) * 100;
			return n < 2 ? 50 : (i / (n - 1)) * 100;
		};
		const ySpan = range.max - range.min || 1;
		/** @param {number} v */
		const yAt = (v) => ((range.max - v) / ySpan) * 100;

		const stride = Math.max(1, Math.ceil(n / SKELETON_POINTS));
		/** @param {any[]} values @param {boolean} [reverse] */
		const pointsOf = (values, reverse = false) => {
			/** @type {string[]} */
			const pts = [];
			for (let i = 0; i < values.length; i += stride) {
				const v = values[i];
				if (typeof v !== 'number' || !Number.isFinite(v)) continue;
				pts.push(`${r1(xAt(i))},${r1(yAt(v))}`);
			}
			return reverse ? pts.reverse() : pts;
		};

		/** @type {{ points: string, color: string, width: number }[]} */
		const lines = [];
		/** @type {{ cx: number, w: number, y: number, h: number, color: string }[]} */
		const bars = [];
		/** @type {{ x: number, y: number, d: number, color: string }[]} */
		const dots = [];
		const zeroY = yAt(Math.min(Math.max(0, range.min), range.max));
		for (const s of series) {
			if (s.bar) {
				// Chart.js bar width: categoryPercentage 0.8 × barPercentage 0.9 of the
				// band, capped by the maxBarThickness of 40 createChart sets (applied in
				// CSS, since the SVG is stretched).
				const w = (100 / n) * 0.72;
				for (let i = 0; i < s.values.length; i++) {
					const v = s.values[i];
					if (typeof v !== 'number' || !Number.isFinite(v)) continue;
					const y = yAt(v);
					bars.push({ cx: r1(xAt(i)), w: r1(w), y: r1(Math.min(y, zeroY)), h: r1(Math.abs(zeroY - y)), color: s.color });
				}
				continue;
			}
			const pts = pointsOf(s.values);
			if (pts.length > 1) lines.push({ points: pts.join(' '), color: s.color, width: s.width });
			// Measurement dots. Drawn as elements of their own rather than SVG circles
			// because the plot SVG is stretched to the plot area — a circle in it would
			// come out an ellipse.
			if (s.dot > 0) {
				for (let i = 0; i < s.values.length; i += stride) {
					const v = s.values[i];
					if (typeof v !== 'number' || !Number.isFinite(v)) continue;
					dots.push({ x: r1(xAt(i)), y: r1(yAt(v)), d: s.dot * 2, color: s.dotColor });
				}
			}
		}

		let band = null;
		if (bandUpper && bandLower) {
			const up = pointsOf(bandUpper);
			const down = pointsOf(bandLower, true);
			if (up.length > 1 && down.length > 1) band = { points: [...up, ...down].join(' '), color: bandColor };
		}

		if (!lines.length && !bars.length) return null;
		return {
			gut,
			band,
			lines,
			bars,
			dots,
			ticks: tickValues.map((v, i) => ({ label: labels[i], top: r1(yAt(v)) })),
			// Layout depends on the label width, so charts with differently-sized
			// numbers get their own remembered geometry.
			key: `fitchart:${type}|${height}|${title ? 1 : 0}|${yUnit}|${y2Unit}|${xAxis ? 'lin' : dates.length ? 'time' : 'cat'}|${widest}`
		};
	});

	/** Remember the real plot area so the next cold load draws the ghost on it. */
	function saveCalibration() {
		const key = skeleton?.key;
		const area = chart?.chartArea;
		if (!key || !area || !canvas) return;
		const cw = canvas.clientWidth;
		const ch = canvas.clientHeight;
		if (!cw || !ch) return;
		try {
			localStorage.setItem(key, JSON.stringify({
				l: Math.round(area.left),
				t: Math.round(area.top),
				r: Math.round(cw - area.right),
				b: Math.round(ch - area.bottom)
			}));
		} catch {
			// Private mode / quota — the estimate stays good enough.
		}
	}

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
		if (!c || !c.options?.scales) return;
		// Fitted per axis, over only the datasets plotted against it: pooling a body
		// weight line (≈75 kg) with protein bars (≈150 g) would stretch both out of
		// readability, and would leave a right-hand axis unfitted entirely.
		/** @type {Map<string, { lo: number, hi: number, bars: boolean }>} */
		const perAxis = new Map();
		for (const ds of c.data.datasets) {
			const axisId = /** @type {any} */ (ds).yAxisID ?? 'y';
			if (!(/** @type {any} */ (c.options.scales)[axisId])) continue;
			let agg = perAxis.get(axisId);
			if (!agg) { agg = { lo: Infinity, hi: -Infinity, bars: false }; perAxis.set(axisId, agg); }
			if (ds.type === 'bar' || (type === 'bar' && !ds.type)) agg.bars = true;
			for (const pt of /** @type {any[]} */ (ds.data)) {
				if (pt == null) continue;
				const y = typeof pt === 'object' ? pt.y : pt;
				if (y == null || !Number.isFinite(y)) continue;
				if (typeof pt === 'object' && pt.x != null) {
					const xv = new Date(pt.x).getTime();
					if (Number.isFinite(xv) && (xv < xMin || xv > xMax)) continue;
				}
				if (y < agg.lo) agg.lo = y;
				if (y > agg.hi) agg.hi = y;
			}
		}
		/** @type {Map<string, { min: number, max: number, nonNeg: boolean }>} */
		const ranges = new Map();
		for (const [axisId, agg] of perAxis) {
			if (!Number.isFinite(agg.lo) || !Number.isFinite(agg.hi)) continue;
			let lo = agg.lo;
			let hi = agg.hi;
			// Bars are read against zero, so keep the baseline in view even when the
			// visible slice sits entirely above or below it — otherwise they float, and a
			// goal line at zero would be drawn outside the plot area. A line series is
			// fitted to its own range instead: anchoring body weight to zero would draw
			// every real fluctuation as a flat line.
			if (agg.bars) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
			const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
			ranges.set(axisId, {
				// Padding must not open up an impossible range: a quantity that cannot go
				// below zero (grams eaten) gets a baseline of exactly zero, not −pad. A
				// series that genuinely goes negative (calorie balance) keeps its pad.
				min: lo === 0 && agg.lo >= 0 ? 0 : lo - pad,
				max: hi + pad,
				nonNeg: agg.lo >= 0
			});
		}

		if (ranges.has('y2')) {
			// Both axes have to share a tick count, or the two grids fight. The primary
			// axis picks it by fitting its own data to readable gridlines; every other
			// axis then divides its own range into that many.
			const primaryId = ranges.has('y') ? 'y' : /** @type {string} */ ([...ranges.keys()][0]);
			const primary = /** @type {any} */ (ranges.get(primaryId));
			const fit = niceFit(primary.min, primary.max, MAX_Y_INTERVALS);
			for (const [axisId, r] of ranges) {
				const box = axisId === primaryId ? fit : niceRange(r.min, r.max, fit.intervals + 1);
				const ys = /** @type {any} */ (c.options.scales)[axisId];
				ys.min = r.nonNeg ? Math.max(0, box.min) : box.min;
				ys.max = box.max;
				if (ys.ticks) ys.ticks.count = fit.intervals + 1;
			}
			return;
		}

		for (const [axisId, r] of ranges) {
			const ys = /** @type {any} */ (c.options.scales)[axisId];
			ys.min = r.min;
			ys.max = r.max;
		}
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

	// ── Touch: auto-dismiss the tooltip after the finger lifts ─────────────────
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let touchDismissTimer;

	function cancelTouchDismiss() {
		if (touchDismissTimer) { clearTimeout(touchDismissTimer); touchDismissTimer = undefined; }
	}

	/** Clear the tooltip + dashed cursor (and any parent-synced hover). */
	function clearHover() {
		const c = chart;
		if (!c) return;
		c.setActiveElements([]);
		c.tooltip?.setActiveElements([], { x: 0, y: 0 });
		c.update('none');
		onHover?.(null);
	}

	/** @param {PointerEvent} e */
	function onTouchStart(e) {
		if (e.pointerType === 'mouse') return;
		cancelTouchDismiss();
	}

	/** @param {PointerEvent} e */
	function onTouchEnd(e) {
		if (e.pointerType === 'mouse') return;
		cancelTouchDismiss();
		touchDismissTimer = setTimeout(() => {
			touchDismissTimer = undefined;
			clearHover();
		}, TOUCH_DISMISS_MS);
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
				// The first and last points sit exactly on the x limits, so with the
				// default clip (the plot area's edges) only their inner halves get
				// drawn. Widen the clip box horizontally by a point's worth of pixels
				// so the end markers render whole. Top/bottom stay clipped: a σ-band
				// fill spilling past the axes would read as a drawing bug.
				clip: ds.clip ?? { left: EDGE_CLIP_PAD, right: EDGE_CLIP_PAD, top: 0, bottom: 0 },
				order: ds.order ?? i,
				...(isBar ? { maxBarThickness: 40 } : {})
			};
		});

		// Bar charts of small counts (workouts per week) read best on whole-number
		// ticks, but forcing a step of 1 on a chart that runs into the thousands asks
		// Chart.js for thousands of ticks — past its 1000-tick guard it gives up and
		// draws none. So the integer step only applies while the values stay small.
		const barValues = type !== 'bar' ? [] : plainDatasets.flatMap((ds) =>
			/** @type {any[]} */ (ds.data).flatMap((pt) => {
				const y = pt != null && typeof pt === 'object' ? pt.y : pt;
				return typeof y === 'number' && Number.isFinite(y) ? [y] : [];
			})
		);
		const barPeak = Math.max(0, ...barValues.map((y) => Math.abs(y)));
		// …and only when the series really is counts. A small fractional series
		// (protein g/kg, all between 1 and 3) would otherwise collapse onto two ticks.
		const yStepSize = type === 'bar' && barPeak <= 12 && barValues.every((y) => Number.isInteger(y))
			? 1
			: undefined;

		// A second y-axis on the right, for a series in different units riding along
		// with the first (body weight over protein bars). Both axes are pinned to the
		// same tick count so their gridlines coincide — a fixed count also overrides
		// any integer stepSize, which only ever applied to a single-axis count chart.
		const hasY2 = (data.datasets || []).some((/** @type {any} */ ds) => ds.yAxisID === 'y2');
		const Y_TICK_COUNT = 6;

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
				// Two axes: hovering should surface both series for that day, not only
				// the bar the pointer happens to be inside.
				interaction: type === 'line' || hasY2 ? { mode: 'index', intersect: false } : undefined,
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
						beginAtZero: !yAxis && type === 'bar',
						...(yAxis ? { min: yAxis.min, max: yAxis.max } : {}),
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
								const label = tk.label ?? yTickLabel(scale.getLabelForValue(tk.value));
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
							stepSize: yAxis ? yAxis.stepSize : hasY2 ? undefined : yStepSize,
							count: hasY2 ? Y_TICK_COUNT : undefined,
							// A pinned axis already fits its gridlines to the box height, so
							// don't let autoskip drop every second one.
							autoSkip: yAxis ? false : undefined,
							callback: (/** @type {any} */ v) => yTickLabel(v)
						}
					},
					...(hasY2 ? {
						y2: {
							position: 'right',
							// Auto-fitted, never zero-based: a weight series spanning 72–76 kg
							// drawn from zero is a flat line that says nothing.
							beginAtZero: false,
							grid: { display: false }, // the left axis owns the gridlines
							border: { display: false },
							afterFit: y2WidthGroup ? (/** @type {any} */ scale) => {
								const ctx = scale.ctx;
								const size = scale.options?.ticks?.font?.size ?? 11;
								ctx.save();
								ctx.font = `${size}px Helvetica, Arial, "Noto Sans", sans-serif`;
								let textW = 0;
								for (const tk of scale.ticks ?? []) {
									const label = tk.label ?? tickLabel(scale.getLabelForValue(tk.value), y2Decimals, y2Unit);
									const w = ctx.measureText(String(label)).width;
									if (w > textW) textW = w;
								}
								ctx.restore();
								y2WidthGroup.report(Math.ceil(textW) + 10);
								scale.width = y2WidthGroup.max;
							} : undefined,
							ticks: {
								color: textColor,
								font: { size: 11 },
								count: Y_TICK_COUNT,
								callback: (/** @type {any} */ v) => tickLabel(v, y2Decimals, y2Unit)
							}
						}
					} : y2WidthGroup ? {
						// No right-hand series of its own, but it is stacked with charts that
						// have one: reserve the same width as blank space so all the plot
						// areas end at the same x.
						y2: {
							position: 'right',
							grid: { display: false },
							border: { display: false },
							ticks: { display: false },
							afterFit: (/** @type {any} */ scale) => { scale.width = y2WidthGroup.max; }
						}
					} : {})
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
						displayColors: showColorKey || !!tooltipLabelColor,
						usePointStyle: true,
						boxPadding: 6,
						borderWidth: 0,
						cornerRadius: 8,
						padding: 10,
						filter: (/** @type {any} */ ctx) => !(ctx.dataset?.label ?? '').includes('σ'),
						callbacks: {
							...(tooltipLabelColor ? {
								// Colour the tooltip swatch by value (e.g. red below zero).
								labelColor: (/** @type {any} */ ctx) => {
									const c = tooltipLabelColor(ctx.parsed.y, ctx.datasetIndex, ctx.dataIndex);
									return { borderColor: c, backgroundColor: c, borderWidth: 0, borderRadius: 4 };
								}
							} : {}),
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

		saveCalibration();

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
		// Snap the ghost onto the plot area this chart had last time. Read here
		// rather than during render so the SSR'd markup and the first client render
		// stay identical.
		try {
			const stored = skeleton?.key ? localStorage.getItem(skeleton.key) : null;
			if (stored) cal = JSON.parse(stored);
		} catch {
			// No storage / bad JSON — the estimate stands.
		}
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => setTimeout(createChart, 100);
		/** @type {MutationObserver | undefined} */
		let obs;

		// Pan/pinch/wheel gesture wiring (zoom mode only). Pointer events cover
		// mouse-drag, touch-drag and multi-touch pinch; wheel zooms on desktop.
		// Touch tooltips are dismissed on a timer after the finger lifts (all charts,
		// zoom or not — a stuck tooltip is just as annoying on a static one).
		if (canvas) {
			canvas.addEventListener('pointerdown', onTouchStart);
			canvas.addEventListener('pointerup', onTouchEnd);
			canvas.addEventListener('pointercancel', onTouchEnd);
			canvas.addEventListener('pointerleave', onTouchEnd);
		}

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
			cancelTouchDismiss();
			if (canvas) {
				canvas.removeEventListener('pointerdown', onTouchStart);
				canvas.removeEventListener('pointerup', onTouchEnd);
				canvas.removeEventListener('pointercancel', onTouchEnd);
				canvas.removeEventListener('pointerleave', onTouchEnd);
			}
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

	// Push new values into the existing chart when the data prop changes.
	//
	// Rebuilding the canvas would flicker and would drop the pan/zoom window
	// mid-gesture, which matters for the body-trend charts: their Δ is measured from
	// the visible window's start, so every pan hands us a re-zeroed series. Only
	// values (and the title, which can name that baseline) are swapped — a change in
	// dataset *shape* still needs a keyed remount, as the unit switch does.
	$effect(() => {
		const d = data;
		const c = chart;
		const ttl = title;
		if (!c || !d?.datasets || d.datasets.length !== c.data.datasets.length) return;

		const dts = d.dates || [];
		const useTimeAxis = !xAxis && dts.length > 0;
		d.datasets.forEach((/** @type {any} */ ds, /** @type {number} */ i) => {
			const raw = ds.data || [];
			c.data.datasets[i].data = useTimeAxis
				? /** @type {any} */ (raw.map((/** @type {any} */ v, /** @type {number} */ j) => ({ x: dts[j], y: v })))
				: [...raw];
			if (ds.backgroundColor !== undefined) c.data.datasets[i].backgroundColor = ds.backgroundColor;
		});
		if (!useTimeAxis && !xAxis) c.data.labels = [...(d.labels || [])];

		const titleOpts = /** @type {any} */ (c.options.plugins)?.title;
		if (titleOpts) { titleOpts.display = !!ttl; titleOpts.text = ttl; }

		// Values moved, so the auto-fitted y range no longer matches them.
		if (zoom) { const w = currentWindow(); autofitY(w.min, w.max); }
		c.update('none');
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
		{#if !chart && skeleton}
			<!-- Stand-in until Chart.js has drawn: the same series, on the same plot
			     area, with the same gridlines and y ticks. -->
			<div class="chart-skeleton" out:fade={{ duration: 150 }} aria-hidden="true">
				{#if title}
					<!-- Chart.js paints the title inside the canvas, so it would pop in
					     with the chart unless we stand in for it too. -->
					<span class="skeleton-title">{title}</span>
				{/if}
				<div
					class="skeleton-plot"
					style:left="{skeleton.gut.l}px"
					style:top="{skeleton.gut.t}px"
					style:right="{skeleton.gut.r}px"
					style:bottom="{skeleton.gut.b}px"
				>
					<svg viewBox="0 0 100 100" preserveAspectRatio="none">
						{#each skeleton.ticks as tk (tk.top)}
							<line class="skeleton-grid" x1="0" y1={tk.top} x2="100" y2={tk.top} vector-effect="non-scaling-stroke" />
						{/each}
						{#if skeleton.band}
							<polygon points={skeleton.band.points} style:fill={skeleton.band.color} />
						{/if}
						{#each skeleton.lines as ln, i (i)}
							<polyline
								class="skeleton-line"
								points={ln.points}
								style:stroke={ln.color}
								style:stroke-width={ln.width}
								vector-effect="non-scaling-stroke"
							/>
						{/each}
					</svg>
					{#each skeleton.bars as b, i (i)}
						<span
							class="skeleton-bar"
							style:left="{b.cx}%"
							style:width="min(40px, {b.w}%)"
							style:top="{b.y}%"
							style:height="{b.h}%"
							style:background={b.color}
						></span>
					{/each}
					{#each skeleton.dots as dot, i (i)}
						<span
							class="skeleton-dot"
							style:left="{dot.x}%"
							style:top="{dot.y}%"
							style:width="{dot.d}px"
							style:height="{dot.d}px"
							style:background={dot.color}
						></span>
					{/each}
					{#each skeleton.ticks as tk (tk.top)}
						<span class="skeleton-tick" style:top="{tk.top}%">{tk.label}</span>
					{/each}
				</div>
			</div>
		{/if}
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
	/* The ghost is laid out on the plot area Chart.js will use — inset by the
	   measured (or estimated) axis gutters — so the swap is a fade, not a jump. */
	.chart-skeleton {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.skeleton-title {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 14px;
		font-weight: bold;
		line-height: 1.2;
		color: var(--color-text-primary);
	}
	.skeleton-plot {
		position: absolute;
	}
	.skeleton-plot svg {
		width: 100%;
		height: 100%;
		display: block;
		overflow: visible;
	}
	/* Same rgba(text, 0.08) Chart.js draws its gridlines with, in both themes. */
	.skeleton-grid {
		stroke: color-mix(in srgb, var(--color-text-primary) 9%, transparent);
		stroke-width: 1;
	}
	.skeleton-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.skeleton-bar {
		position: absolute;
		transform: translateX(-50%);
	}
	.skeleton-dot {
		position: absolute;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	/* Right-aligned 11px from the plot edge: Chart.js's 8px tick mark + 3px pad. */
	.skeleton-tick {
		position: absolute;
		right: calc(100% + 11px);
		transform: translateY(-50%);
		font-size: 11px;
		line-height: 1.2;
		white-space: nowrap;
		color: var(--color-text-primary);
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
