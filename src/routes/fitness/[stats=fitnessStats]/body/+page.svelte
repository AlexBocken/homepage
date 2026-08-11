<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import GoalForecastCard from '$lib/components/fitness/GoalForecastCard.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Toggle from '$lib/components/Toggle.svelte';
	import { invalidateAll } from '$app/navigation';
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const theme = document.documentElement.dataset.theme;
		if (theme === 'dark') return true;
		if (theme === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	let dark = $state(checkDark());
	// Whether the fitted line and its cone are drawn over the measurements. A
	// projection is a different kind of claim from a weigh-in, and some days you
	// only want to look at what actually happened — so the choice sticks.
	const PROJECTION_KEY = 'fitness-body-projection';
	let showProjection = $state(true);
	function persistProjection() {
		try { localStorage.setItem(PROJECTION_KEY, showProjection ? '1' : '0'); } catch { /* private mode */ }
	}

	onMount(() => {
		try {
			const stored = localStorage.getItem(PROJECTION_KEY);
			if (stored != null) showProjection = stored === '1';
		} catch { /* private mode */ }
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
	// Neutral against both charts' own colours: the projection is a different kind
	// of statement from the measured series, and should not be mistaken for one.
	const projectionColor = $derived(dark ? '#EBCB8B' : '#B48E00');
	const projectionFill = $derived(dark ? 'rgba(235, 203, 139, 0.13)' : 'rgba(180, 142, 0, 0.10)');
	const bfAccentFill = $derived(dark ? 'rgba(180, 142, 173, 0.2)' : 'rgba(180, 142, 173, 0.16)');

	const weightChart = $derived(data.weightChart ?? { dates: [], data: [], sma: [], upper: [], lower: [] });
	const emptyBf = { dates: [], data: [], sma: [], upper: [], lower: [] };
	const bfPctChart = $derived(data.bfChart ?? emptyBf);
	const bfMassChart = $derived(data.bfMassChart ?? emptyBf);

	// Body fat can be read as a percentage of body weight or as fat mass in kg. Both
	// arrive absolute and are plotted as Δ from the visible window's start (see
	// `bfChart`), so what the eye compares is the change across what it can see.
	let bfUnit = $state(/** @type {'pct' | 'kg'} */ ('pct'));
	const hasBfPct = $derived((bfPctChart.data?.length ?? 0) > 1);
	const hasBfMass = $derived((bfMassChart.data?.length ?? 0) > 1);
	const bfAbsolute = $derived(bfUnit === 'kg' && hasBfMass ? bfMassChart : bfPctChart);
	const bfUnitSuffix = $derived(bfUnit === 'kg' && hasBfMass ? ' kg' : ' pp');

	const hasWeight = $derived((weightChart.data?.length ?? 0) > 1);
	const hasBf = $derived(hasBfPct || hasBfMass);

	// ── Visible x window ───────────────────────────────────────────────────────
	// Full extent of the data (epoch ms) — the pan/zoom limits. Taken from the
	// absolute series: the Δ series is derived from the window, so reading it here
	// would make the window depend on itself.
	const fullRange = $derived.by(() => {
		const stamps = [...(weightChart.dates ?? []), ...(bfAbsolute.dates ?? [])]
			.map((/** @type {string} */ d) => new Date(d).getTime())
			.filter((n) => Number.isFinite(n));
		if (!stamps.length) return null;
		// The projection reaches past the last reading, so the pannable range has to
		// as well — otherwise the line it draws is stuck beyond the right edge.
		const ends = [weightProjection?.endMs, bfProjection?.endMs].filter((n) => typeof n === 'number');
		return { min: Math.min(...stamps), max: Math.max(...stamps, ...ends) };
	});

	// A month is the span most weight questions are about, and a year of daily
	// readings compresses the recent trend into the last few pixels. Zooming out to
	// the whole history is a pinch or a scroll away.
	const DEFAULT_DAYS = 30;
	const defaultRange = $derived.by(() => {
		if (!fullRange) return null;
		// The window is anchored on the last *reading*, not on the projection's far
		// end, so the recent history keeps its scale whether or not a goal is set.
		// Any future the projection covers is added on top of that.
		const lastReading = Math.max(
			...[...(weightChart.dates ?? []), ...(bfAbsolute.dates ?? [])]
				.map((/** @type {string} */ d) => new Date(d).getTime())
				.filter((n) => Number.isFinite(n))
		);
		return {
			min: Math.max(fullRange.min, lastReading - (DEFAULT_DAYS - 1) * 86400000),
			// As much of the projection as fits in the same span the history gets. An
			// arrival eight months out would otherwise squeeze the last month into a
			// tenth of the width; panning right still reaches it.
			max: Math.min(fullRange.max, lastReading + DEFAULT_DAYS * 86400000)
		};
	});

	// Shared x window across both charts. A gesture on either writes `userRange`,
	// which takes over from the default until it is reset.
	/** @type {{ min: number, max: number } | null} */
	let userRange = $state(null);
	const xRange = $derived(userRange ?? defaultRange);
	const isZoomed = $derived(userRange !== null);
	/** @param {{ min: number, max: number }} r */
	function onRange(r) { userRange = { ...r }; }
	function resetZoom() { userRange = null; }

	// ── Window-relative Δ ──────────────────────────────────────────────────────

	/**
	 * The value the window's Δ counts from.
	 *
	 * The first reading inside the window is the natural zero — that is the point
	 * the eye starts from. A window that contains no reading at all (zoomed into a
	 * gap between measurements) falls back to the trend line, which is defined
	 * everywhere between readings: it is interpolated at the window's start so the
	 * curve still reads as "change since the left edge" instead of jumping to
	 * whatever the last window's baseline happened to be.
	 *
	 * @param {{ dates?: string[], data?: (number|null)[], sma?: (number|null)[] }} series
	 * @param {{ min: number, max: number } | null} range
	 */
	function baselineFor(series, range) {
		const dates = series.dates ?? [];
		const values = series.data ?? [];
		if (!dates.length) return null;
		const stamps = dates.map((d) => new Date(d).getTime());

		if (!range) return values[0] ?? null;

		for (let i = 0; i < stamps.length; i++) {
			if (stamps[i] < range.min || stamps[i] > range.max) continue;
			if (values[i] != null) return values[i];
		}

		// Interpolate the trend at the window start, clamping to the ends so a window
		// entirely before or after the data still has a defined zero.
		const sma = series.sma ?? [];
		/** @type {number[]} */
		const known = [];
		for (let i = 0; i < sma.length; i++) if (sma[i] != null) known.push(i);
		if (!known.length) return values[0] ?? null;
		const x = range.min;
		if (x <= stamps[known[0]]) return sma[known[0]];
		const last = known[known.length - 1];
		if (x >= stamps[last]) return sma[last];
		for (let k = 1; k < known.length; k++) {
			const a = known[k - 1];
			const b = known[k];
			if (x <= stamps[b]) {
				const span = stamps[b] - stamps[a];
				const t = span > 0 ? (x - stamps[a]) / span : 0;
				return /** @type {number} */ (sma[a]) + (/** @type {number} */ (sma[b]) - /** @type {number} */ (sma[a])) * t;
			}
		}
		return sma[last];
	}

	/** @param {number} v */
	const round2 = (v) => Math.round(v * 100) / 100;

	// The plotted body-fat series: absolute values re-expressed as Δ from the
	// window's baseline, so panning re-zeroes the curve on what is now on screen.
	const bfChart = $derived.by(() => {
		const abs = bfAbsolute;
		const base = baselineFor(abs, xRange);
		if (base == null) return { ...abs, baseline: null };
		/** @param {(number|null)[] | undefined} arr */
		const shift = (arr) => (arr ?? []).map((v) => (v == null ? null : round2(v - base)));
		return {
			dates: abs.dates,
			data: shift(abs.data),
			sma: shift(abs.sma),
			upper: shift(abs.upper),
			lower: shift(abs.lower),
			baseline: round2(base),
		};
	});

	// ── Goals ──────────────────────────────────────────────────────────────────
	// The body-fat card follows the unit switch: in kg it aims at a fat mass, in
	// % at a percentage. Two goals, one slot, no extra control to explain.
	const targets = $derived(data.targets ?? { weightKg: null, bodyFatPercent: null, fatMassKg: null, date: null });
	const forecasts = $derived(data.forecasts ?? { weight: null, bodyFat: null, fatMass: null });
	const bfIsKg = $derived(bfUnit === 'kg' && hasBfMass);
	const bfGoal = $derived(bfIsKg ? targets.fatMassKg : targets.bodyFatPercent);
	const bfReport = $derived(bfIsKg ? forecasts.fatMass : forecasts.bodyFat);

	// The body-fat chart plots Δ from the visible window's baseline, so an
	// absolute goal has to be shifted onto the same footing to line up.
	const bfGoalLine = $derived(
		bfGoal != null && bfChart.baseline != null ? round2(bfGoal - bfChart.baseline) : undefined
	);

	let savingGoal = $state(/** @type {null | 'weight' | 'bf'} */ (null));

	/**
	 * @param {'weight' | 'bf'} which
	 * @param {number | null} goal
	 * @param {string | null} date
	 */
	async function saveGoal(which, goal, date) {
		savingGoal = which;
		const key = which === 'weight' ? 'targetWeightKg' : bfIsKg ? 'targetFatMassKg' : 'targetBodyFatPercent';
		try {
			// One deadline covers every body target — they describe the same body over
			// the same stretch of time — so it only travels when it actually changed.
			// Otherwise dropping one goal, or saving a value while leaving the date
			// field alone, would silently clear the date the other card is using.
			const dateChanged = goal != null && (date ?? null) !== (targets.date ?? null);
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [key]: goal, ...(dateChanged ? { targetDate: date } : {}) })
			});
			if (res.ok) await invalidateAll();
		} catch (err) {
			console.error('[body] saving goal failed:', err);
		}
		savingGoal = null;
	}

	// ── Projection line ────────────────────────────────────────────────────────
	// The straight line the arrival date is read off: the weighted linear fit,
	// drawn across the stretch it was fitted to and continued to the goal. It is
	// deliberately visible next to the EMA trend, because the two disagree by
	// design — an EMA trails a steady change by about τ·rate, and seeing that gap
	// is the point. Where they diverge wildly, the forecast is not to be trusted.
	const DAY = 86400000;
	// How far the line runs past the last reading when there is no arrival to aim
	// at. Matches the window it is fitted over, and the default view's right half.
	const PROJECT_AHEAD_DAYS = 30;

	/**
	 * Absolute geometry only — no Δ baseline in here. The baseline comes from the
	 * visible window, the visible window's extent has to account for how far the
	 * projection reaches, and letting the two meet would make the window depend on
	 * itself. The shift is applied at draw time instead, where it is harmless.
	 * @param {any} fit a LinearFit from the server, or null
	 * @param {any} forecast the matching GoalReport's forecast, when a goal is set
	 */
	function projectionOf(fit, forecast = null) {
		if (!fit) return null;
		// Back across the window it was fitted to, forward to the arrival — or, with
		// nothing being aimed at, as far forward as it looks back, which is exactly
		// the span the default view shows.
		const startMs = fit.windowStartMs;
		const endMs = forecast?.status === 'eta' ? forecast.etaMs : fit.lastMs + PROJECT_AHEAD_DAYS * DAY;
		/** @param {number} ms */
		const at = (ms) => fit.level + (fit.slope * (ms - fit.lastMs)) / DAY;
		// Half-width of the shaded cone: the same slope ± one standard error the
		// arrival window is read off, so where the cone crosses the goal line is
		// exactly the earliest/latest date on the card. It pinches to nothing at the
		// last reading — that is the one moment the fit is anchored to.
		/** @param {number} ms */
		const spread = (ms) =>
			Number.isFinite(fit.seSlope) ? (fit.seSlope * Math.abs(ms - fit.lastMs)) / DAY : 0;
		return { startMs, endMs, at, spread, hasFuture: endMs > fit.lastMs };
	}

	// A fit exists whenever the readings support one, goal or no goal — "where is
	// this heading" stands on its own. A goal only changes where the line stops.
	const fits = $derived(data.fits ?? { weight: null, bodyFat: null, fatMass: null });
	const bfFit = $derived(bfIsKg ? fits.fatMass : fits.bodyFat);
	const weightProjection = $derived(showProjection ? projectionOf(fits.weight, forecasts.weight?.forecast) : null);
	const bfProjection = $derived(showProjection ? projectionOf(bfFit, bfReport?.forecast) : null);
	const hasProjection = $derived(!!fits.weight || !!bfFit);

	/**
	 * Fold a projection into a chart's data: the future point needs a date of its
	 * own on the shared axis, so every other series gains a null there.
	 * @param {string[]} dates
	 * @param {{ startMs: number, endMs: number, at: (ms: number) => number, spread: (ms: number) => number, hasFuture: boolean } | null} proj
	 * @param {number} shift subtracted from every value (the Δ baseline, or 0)
	 * @param {number | null} visibleMaxMs right edge of the x window, if there is one
	 */
	function withProjection(dates, proj, shift = 0, visibleMaxMs = null) {
		// Stop the line at the edge of what is on screen. Chart.js fits y to the
		// points inside the x window, so a far-off arrival left at its true date
		// would be excluded from that reckoning and the visible part of the line
		// would run straight out of the plot area.
		const endMs = proj ? (visibleMaxMs != null ? Math.min(proj.endMs, visibleMaxMs) : proj.endMs) : 0;
		const extra = proj && endMs > proj.startMs && endMs > new Date(dates[dates.length - 1] ?? 0).getTime()
			? [new Date(endMs).toISOString()]
			: [];
		/** @param {(number|null)[] | undefined} arr */
		const pad = (arr) => [...(arr ?? []), ...extra.map(() => null)];
		/** @param {(ms: number) => number} valueAt */
		const series = (valueAt) => [
			...dates.map((d) => {
				const ms = new Date(d).getTime();
				return ms >= /** @type {any} */ (proj).startMs ? round2(valueAt(ms) - shift) : null;
			}),
			...extra.map(() => round2(valueAt(endMs) - shift))
		];
		if (!proj) return { dates: [...dates, ...extra], pad, line: null, upper: null, lower: null };
		return {
			dates: [...dates, ...extra],
			pad,
			line: series((ms) => proj.at(ms)),
			upper: series((ms) => proj.at(ms) + proj.spread(ms)),
			lower: series((ms) => proj.at(ms) - proj.spread(ms))
		};
	}

	const hasSma = $derived(weightChart.sma?.some((/** @type {any} */ v) => v !== null));
	const hasSmaBf = $derived(bfChart.sma?.some((/** @type {any} */ v) => v !== null));

	const weightChartData = $derived.by(() => {
		const { dates, pad, line, upper, lower } = withProjection(weightChart.dates ?? [], weightProjection, 0, xRange?.max ?? null);
		return {
			dates,
			datasets: [
				...(hasSma ? [
					{ label: '± 1σ', data: pad(weightChart.upper), borderColor: 'transparent', backgroundColor: primaryFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
					{ label: '± 1σ (lower)', data: pad(weightChart.lower), borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
					{ label: 'Trend', data: pad(weightChart.sma), borderColor: primary, pointRadius: 0, borderWidth: 3, tension: 0.3, order: 1 }
				] : []),
				...(line ? [
					// The cone first: fill: '+1' shades down to the transparent lower
					// bound that follows it, exactly as the σ band does.
					{ label: '± 1σ (projection)', data: upper, borderColor: 'transparent', backgroundColor: projectionFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0, order: 2 },
					{ label: '± 1σ (projection lower)', data: lower, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0, order: 2 },
					{ label: t.goal_projection, data: line, borderColor: projectionColor, borderDash: [6, 4], borderWidth: 2, pointRadius: 0, tension: 0, fill: false, order: 1 }
				] : []),
				{ label: 'Weight (kg)', data: pad(weightChart.data), borderColor: '#A3BE8C', borderWidth: hasSma ? 1 : 2, pointRadius: 2, order: 0 }
			]
		};
	});

	const bfChartData = $derived.by(() => {
		const { dates, pad, line, upper, lower } = withProjection(bfChart.dates ?? [], bfProjection, bfChart.baseline ?? 0, xRange?.max ?? null);
		return {
			dates,
			datasets: [
				...(hasSmaBf ? [
					{ label: '± 1σ', data: pad(bfChart.upper), borderColor: 'transparent', backgroundColor: bfAccentFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
					{ label: '± 1σ (lower)', data: pad(bfChart.lower), borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
					{ label: 'Trend', data: pad(bfChart.sma), borderColor: bfAccent, pointRadius: 0, borderWidth: 3, tension: 0.3, order: 1 }
				] : []),
				...(line ? [
					// The cone first: fill: '+1' shades down to the transparent lower
					// bound that follows it, exactly as the σ band does.
					{ label: '± 1σ (projection)', data: upper, borderColor: 'transparent', backgroundColor: projectionFill, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0, order: 2 },
					{ label: '± 1σ (projection lower)', data: lower, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0, order: 2 },
					{ label: t.goal_projection, data: line, borderColor: projectionColor, borderDash: [6, 4], borderWidth: 2, pointRadius: 0, tension: 0, fill: false, order: 1 }
				] : []),
				{ label: bfUnit === 'kg' ? 'Fat mass Δ (kg)' : 'Body fat Δ (pp)', data: pad(bfChart.data), borderColor: '#D08770', borderWidth: hasSmaBf ? 1 : 2, pointRadius: 2, order: 0 }
			]
		};
	});

	/**
	 * @param {number} v
	 * @param {number} _datasetIndex
	 * @param {number} dataIndex
	 * @param {string} label
	 */
	function bfTooltipFormatter(v, _datasetIndex, dataIndex, label) {
		const kg = bfUnit === 'kg' && hasBfMass;
		const deltaUnit = kg ? ' kg' : ' pp';
		const absUnit = kg ? ' kg' : '%';
		const baseline = bfChart.baseline ?? 0;
		const abs = baseline + v;
		const sign = v > 0 ? '+' : v < 0 ? '' : '±';
		const base = `${sign}${v.toFixed(2)}${deltaUnit} · ${abs.toFixed(1)}${absUnit}`;
		if (label === 'Trend') {
			const upper = bfChart.upper?.[dataIndex];
			const lower = bfChart.lower?.[dataIndex];
			if (upper != null && lower != null) {
				const sigma = (upper - lower) / 2;
				const absLower = baseline + lower;
				const absUpper = baseline + upper;
				return `${sign}${v.toFixed(2)} ±${sigma.toFixed(2)}${deltaUnit} · ${abs.toFixed(1)}${absUnit} (${absLower.toFixed(1)}–${absUpper.toFixed(1)}${absUnit})`;
			}
		}
		return base;
	}

	const bfChartTitle = $derived.by(() => {
		const kg = bfUnit === 'kg' && hasBfMass;
		const baseline = bfChart.baseline;
		const label = kg ? t.fat_mass : t.body_fat.replace(' %', '').replace(' (%)', '');
		if (baseline == null) return label;
		const base = kg ? `${baseline.toFixed(1)} kg` : `${baseline.toFixed(1)}%`;
		return `${label} · ${t.bf_delta_from_prefix} ${base}`;
	});

</script>

<svelte:head><title>{t.body_trends_title} - Bocken</title></svelte:head>

<div class="body-detail">
	<div class="detail-head">
		<h1>
			{t.body_trends_title}
			{#if !isZoomed}
				<span class="head-range">
					{lang === 'en' ? `last ${DEFAULT_DAYS} days` : `letzte ${DEFAULT_DAYS} Tage`}
				</span>
			{/if}
		</h1>
		<div class="head-row">
			<span class="zoom-hint">{t.body_trends_hint}</span>
			<div class="head-actions">
				{#if hasProjection}
					<Toggle bind:checked={showProjection} label={t.goal_projection} onchange={persistProjection} />
				{/if}
				<button class="reset-btn" onclick={resetZoom} disabled={!isZoomed}>
					<RotateCcw size={14} /> {t.reset_zoom}
				</button>
			</div>
		</div>
	</div>

	{#if hasWeight}
		<!-- Showing or hiding the projection adds and removes datasets, and
		     FitnessChart only pushes new *values* into a live chart — a change of
		     shape needs a remount, same as the unit switch below. The x window
		     survives it via applyXRange. -->
		{#key showProjection}
			<FitnessChart
				data={weightChartData}
				title={t.weight}
				yUnit=" kg"
				height="320px"
				goalLine={targets.weightKg ?? undefined}
				zoom
				applyXRange={xRange}
				onXRangeChange={onRange}
			/>
		{/key}
		<GoalForecastCard
			label={t.weight}
			report={forecasts.weight}
			goal={targets.weightKg}
			targetDate={targets.date}
			unit=" kg"
			decimals={1}
			step={0.1}
			min={30}
			max={300}
			{lang}
			saving={savingGoal === 'weight'}
			onsave={(/** @type {number|null} */ g, /** @type {string|null} */ d) => saveGoal('weight', g, d)}
		/>
	{/if}

	{#if hasBf}
		{#if hasBfPct && hasBfMass}
			<div class="unit-switch" role="group" aria-label={t.bf_unit_switch_label}>
				<button
					class="unit-btn"
					class:is-active={bfUnit === 'pct'}
					aria-pressed={bfUnit === 'pct'}
					onclick={() => (bfUnit = 'pct')}
				>%</button>
				<button
					class="unit-btn"
					class:is-active={bfUnit === 'kg'}
					aria-pressed={bfUnit === 'kg'}
					onclick={() => (bfUnit = 'kg')}
				>kg</button>
			</div>
		{/if}
		<!-- FitnessChart builds its canvas once on mount, so switching units has to
		     remount it. The current x window is restored via applyXRange. -->
		{#key `${bfUnit}-${showProjection}`}
			<FitnessChart
				data={bfChartData}
				title={bfChartTitle}
				yUnit={bfUnitSuffix}
				height="320px"
				goalLine={bfGoalLine}
				tooltipFormatter={bfTooltipFormatter}
				zoom
				applyXRange={xRange}
				onXRangeChange={onRange}
			/>
		{/key}
		<GoalForecastCard
			label={bfIsKg ? t.fat_mass : t.body_fat}
			report={bfReport}
			goal={bfGoal}
			targetDate={targets.date}
			unit={bfIsKg ? ' kg' : '%'}
			decimals={1}
			step={0.1}
			min={bfIsKg ? 1 : 3}
			max={bfIsKg ? 150 : 60}
			{lang}
			saving={savingGoal === 'bf'}
			onsave={(/** @type {number|null} */ g, /** @type {string|null} */ d) => saveGoal('bf', g, d)}
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
	.detail-head h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.head-range {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-secondary);
		margin-left: 0.4rem;
	}
	.head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	/* The switch ships at body size; in a header row it is a control, not prose. */
	.head-actions :global(.toggle-wrapper label) {
		gap: 0.45rem;
		font-size: 0.8rem;
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
	.unit-switch {
		display: flex;
		gap: 0.25rem;
		align-self: flex-end;
		margin-bottom: -0.5rem;
		background: var(--color-bg-tertiary);
		padding: 0.2rem;
		border-radius: var(--radius-pill);
	}
	.unit-btn {
		padding: 0.3rem 0.9rem;
		border: none;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.unit-btn:hover:not(.is-active) { color: var(--color-text-primary); }
	.unit-btn.is-active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem;
	}
</style>
