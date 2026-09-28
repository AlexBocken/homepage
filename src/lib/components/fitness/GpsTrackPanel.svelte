<script>
	import Route from '@lucide/svelte/icons/route';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Mountain from '@lucide/svelte/icons/mountain';
	import { m } from '$lib/js/fitnessI18n';
	import { createTrackHover } from '$lib/stores/trackHover.svelte';
	import { createAxisWidthGroup } from '$lib/stores/axisWidthGroup.svelte';
	import { attachTrackMap, onGraphHover, graphHoverIndex } from '$lib/fitness/gpsTrackHover.svelte';
	import { buildGpsView, formatPaceTooltip, formatPaceAxis } from '$lib/fitness/gpsSeries';
	import { computeBestEfforts } from '$lib/fitness/bestEfforts';
	import { formatElapsed, formatEffortRate, formatPaceKm } from '$lib/fitness/segmentFormat';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';

	/**
	 * One GPS-tracked exercise of a saved session, read-only: distance/pace/elevation
	 * stats, the route map, elevation/pace/cadence charts sharing one hover cursor
	 * with the map, km splits and the best-efforts table.
	 *
	 * Hovering a best effort lights its stretch up on the map; clicking pins it
	 * (`pinnedKm`, bindable so a deep link can pre-pin one). `highlightOverride`
	 * lets the page put another stretch on the map instead (a segment effort).
	 *
	 * @type {{
	 *   track: any[],
	 *   totalDistance?: number | null,
	 *   mapId: string,
	 *   dark: boolean,
	 *   lang?: 'en' | 'de',
	 *   bestEfforts?: import('$lib/fitness/bestEfforts').BestEffort[] | null,
	 *   effortKind?: 'running' | 'cycling',
	 *   pinnedKm?: number | null,
	 *   highlightOverride?: () => [number, number] | null,
	 *   poster?: import('svelte').Snippet,
	 *   footer?: import('svelte').Snippet
	 * }}
	 */
	let {
		track,
		totalDistance = null,
		mapId,
		dark,
		lang = 'en',
		bestEfforts = null,
		effortKind = 'running',
		pinnedKm = $bindable(),
		highlightOverride,
		poster,
		footer
	} = $props();

	const t = $derived(m[lang]);

	// One hover cursor per track, so the map pin and the chart cursors follow each
	// other; one shared y-axis width so the stacked charts line up.
	const hov = createTrackHover();
	const yGroup = createAxisWidthGroup();

	const gps = $derived(buildGpsView(track, { dark, elevationLabel: t.elevation, cadenceLabel: t.cadence }));
	const dist = $derived(totalDistance ?? gps.dist);

	// Prefer the server-precomputed best efforts (one GPS exercise per run, so their
	// indices match this track); compute them here only if they were never backfilled.
	const efforts = $derived(bestEfforts?.length ? bestEfforts : computeBestEfforts(track));

	/** @type {number | null} */
	let hoverKm = $state(null);
	const activeKm = $derived(hoverKm ?? pinnedKm ?? null);

	/** @param {number} km */
	function clickEffort(km) {
		const next = pinnedKm === km ? null : km;
		pinnedKm = next;
		// Scroll the map up into view so the highlighted split is visible.
		if (next != null && typeof document !== 'undefined') {
			document.getElementById(mapId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	/** @returns {[number, number] | null} */
	function highlight() {
		const override = highlightOverride?.();
		if (override) return override;
		if (activeKm == null) return null;
		const e = efforts.find((x) => x.km === activeKm);
		return e ? [e.startIdx, e.endIdx] : null;
	}
</script>

<div class="gps-track-section">
	<div class="gps-stats">
		<span class="gps-stat accent"><Route size={14} /> {dist.toFixed(2)} km</span>
		{#if gps.avgPace > 0}
			<span class="gps-stat accent"><Gauge size={14} /> {formatPaceKm(gps.avgPace)}</span>
		{/if}
		{#if gps.elevStats}
			<span class="gps-stat elev-gain"><Mountain size={14} /> +{gps.elevStats.gain}{t.elevation_unit}</span>
			<span class="gps-stat elev-loss">-{gps.elevStats.loss}{t.elevation_unit}</span>
		{/if}
	</div>
	<div class="track-map" id={mapId} {@attach attachTrackMap(track, hov, { highlight })}>
		{@render poster?.()}
	</div>

	{#if gps.hasCharts}
		{#if gps.elevation.has}
			<div class="chart-section">
				<FitnessChart
					data={gps.elevation.data}
					title="{t.elevation} ({t.elevation_unit})"
					height="160px"
					yUnit="m"
					xAxis={gps.xAxis}
					yAxis={gps.elevation.yAxis}
					yWidthGroup={yGroup}
					onHover={(j) => onGraphHover(hov, gps.elevation.points, j, 'elev')}
					hoverIndex={graphHoverIndex(hov, gps.elevation.points, 'elev')}
				/>
			</div>
		{/if}

		{#if gps.pace.has}
			<div class="chart-section">
				<FitnessChart
					data={gps.pace.data}
					title="Pace (min/km)"
					height="180px"
					xAxis={gps.xAxis}
					yAxis={gps.pace.yAxis}
					yWidthGroup={yGroup}
					yTickFormatter={formatPaceAxis}
					tooltipFormatter={(v) => formatPaceTooltip(v)}
					onHover={(j) => onGraphHover(hov, gps.pace.points, j, 'pace')}
					hoverIndex={graphHoverIndex(hov, gps.pace.points, 'pace')}
				/>
			</div>
		{/if}

		{#if gps.cadence.has}
			<div class="chart-section">
				<FitnessChart
					data={gps.cadence.data}
					title="{t.cadence} ({t.cadence_unit}) · {t.avg} {gps.avgCadence}"
					height="160px"
					yUnit=" spm"
					xAxis={gps.xAxis}
					yAxis={gps.cadence.yAxis}
					yWidthGroup={yGroup}
					onHover={(j) => onGraphHover(hov, gps.cadence.points, j, 'cadence')}
					hoverIndex={graphHoverIndex(hov, gps.cadence.points, 'cadence')}
				/>
			</div>
		{/if}

		{#if gps.splits.length > 1}
			{@const splits = gps.splits}
			{@const avgPace = splits.reduce((a, s) => a + s.pace, 0) / splits.length}
			<div class="splits-section">
				<h4>{t.splits}</h4>
				<table class="splits-table">
					<thead>
						<tr>
							<th>KM</th>
							<th>{t.pace}</th>
							<th>TIME</th>
						</tr>
					</thead>
					<tbody>
						{#each splits as split, i (i)}
							{@const isFull = split.km === Math.floor(split.km)}
							<tr class:partial={!isFull}>
								<td class="split-km">{isFull ? split.km : split.km.toFixed(2)}</td>
								<td class="split-pace" class:fast={split.pace < avgPace * 0.97} class:slow={split.pace > avgPace * 1.03}>
									{formatPaceKm(split.pace)}
								</td>
								<td class="split-elapsed">{formatPaceAxis(split.elapsed)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	{#if efforts.length > 0}
		<div class="splits-section best-efforts">
			<h4>{t.best_efforts}</h4>
			<table class="splits-table">
				<thead>
					<tr><th>{t.distance}</th><th>{effortKind === 'cycling' ? t.speed : t.pace}</th><th>TIME</th></tr>
				</thead>
				<tbody>
					{#each efforts as e (e.km)}
						<!-- svelte-ignore a11y_mouse_events_have_key_events -->
						<tr
							class="be-row"
							class:active={activeKm === e.km}
							class:pinned={pinnedKm === e.km}
							onmouseenter={() => (hoverKm = e.km)}
							onmouseleave={() => (hoverKm = null)}
							onclick={() => clickEffort(e.km)}
						>
							<td class="split-km">{e.km}{t.km_short}</td>
							<td class="split-pace">{formatEffortRate(e.km, e.seconds, effortKind)}</td>
							<td class="split-elapsed">{formatElapsed(e.seconds)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{@render footer?.()}
</div>

<style>
	.gps-track-section {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.gps-stats {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.gps-stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.gps-stat.accent {
		font-weight: 700;
		color: var(--color-primary);
	}
	.gps-stat.elev-gain {
		color: var(--green);
		font-weight: 600;
	}
	.gps-stat.elev-loss {
		color: var(--red);
		font-weight: 600;
		font-size: 0.8rem;
	}
	/* Relative for a poster image laid under the tiles (see the history page). */
	.track-map {
		position: relative;
		height: 200px;
		border-radius: 8px;
		overflow: hidden;
	}
	/* Best-efforts list — hover/click a row to highlight its split on the map.
	   Hover is a neutral row highlight; the active (shown-on-map) and pinned
	   states use the violet that matches the map overlay. */
	.best-efforts .be-row {
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.best-efforts .be-row:hover {
		background: var(--color-bg-elevated);
	}
	.best-efforts .be-row.active .split-km {
		color: #7c3aed;
		font-weight: 700;
	}
	.best-efforts .be-row.active .split-km::before {
		content: '●';
		color: #7c3aed;
		font-size: 0.6em;
		margin-right: 0.35em;
		vertical-align: middle;
	}
	.best-efforts .be-row.pinned {
		background: color-mix(in srgb, #7c3aed 12%, transparent);
	}
	.best-efforts .be-row.pinned td:first-child {
		box-shadow: inset 3px 0 0 #7c3aed;
	}
	:global(.be-endbar) {
		background: transparent !important;
		border: 0 !important;
	}
	:global(.run-hover-pin) {
		background: transparent !important;
		border: 0 !important;
		color: var(--red);
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
		pointer-events: none;
	}
	:global(.run-hover-pin svg) { display: block; width: 28px; height: 34px; }
	.chart-section {
		margin-top: 0.25rem;
	}
	.splits-section {
		margin-top: 0.25rem;
	}
	.splits-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.splits-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}
	.splits-table th {
		text-align: center;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.4rem;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.splits-table td {
		text-align: center;
		padding: 0.3rem 0.4rem;
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
	}
	.split-km {
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.split-pace.fast {
		color: var(--green);
	}
	.split-pace.slow {
		color: var(--orange);
	}
	tr.partial .split-km {
		font-style: italic;
		opacity: 0.7;
	}
	.split-elapsed {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
</style>
