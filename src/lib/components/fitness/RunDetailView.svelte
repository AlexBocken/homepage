<script>
	import { onMount } from 'svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import Weight from '@lucide/svelte/icons/weight';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Route from '@lucide/svelte/icons/route';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Flame from '@lucide/svelte/icons/flame';
	import Info from '@lucide/svelte/icons/info';
	import Mountain from '@lucide/svelte/icons/mountain';
	import { m } from '$lib/js/fitnessI18n';
	import { getExerciseById, getExerciseMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import { formatPaceRangeLabel, formatPaceValue } from '$lib/data/cardioPrRanges';
	import { TILE_URL, ROUTE_COLOR, ROUTE_CASING } from '$lib/data/mapTiles';
	import { computeElevationStats as computeElevationStatsShared } from '$lib/hikes/elevation';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';

	/**
	 * Read-only render of a workout session — the same body the history detail
	 * page shows, minus any editing. Used by the public share page.
	 * @type {{ session: any, lang?: 'en' | 'de', showPrs?: boolean }}
	 */
	let { session, lang = 'en', showPrs = true } = $props();

	const t = $derived(m[lang]);
	const kcalResult = $derived(session?.kcalEstimate ?? null);
	let showKcalInfo = $state(false);

	/** @type {Record<string, { label: string, doi?: string }>} */
	const METHOD_CITATIONS = {
		'lytle':           { label: 'Lytle et al. (2019)', doi: '10.1249/MSS.0000000000001925' },
		'minetti-gps':     { label: 'Minetti et al. (2002)', doi: '10.1152/japplphysiol.01177.2001' },
		'cycling-physics': { label: 'Cycling physics model' },
		'met-speed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'met-fixed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'flat-rate':       { label: 'Flat-rate estimate' }
	};

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const th = document.documentElement.dataset.theme;
		if (th === 'dark') return true;
		if (th === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}
	let dark = $state(checkDark());
	onMount(() => {
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onMql = () => { dark = checkDark(); };
		mql.addEventListener('change', onMql);
		const obs = new MutationObserver(() => { dark = checkDark(); });
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => { mql.removeEventListener('change', onMql); obs.disconnect(); };
	});

	/** @param {number} mins */
	function formatDuration(mins) {
		const h = Math.floor(mins / 60);
		const mm = mins % 60;
		return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
	}

	/** @param {number} weight @param {number} reps */
	function epley1rm(weight, reps) {
		if (reps <= 0 || weight <= 0) return 0;
		if (reps === 1) return weight;
		return Math.round(weight * (1 + reps / 30));
	}

	/** @param {string} exerciseId */
	function isStrength(exerciseId) {
		const metrics = getExerciseMetrics(getExerciseById(exerciseId));
		return metrics.includes('weight') && metrics.includes('reps');
	}

	/** Haversine distance in km @param {any} a @param {any} b */
	function haversine(a, b) {
		const R = 6371;
		const dLat = ((b.lat - a.lat) * Math.PI) / 180;
		const dLng = ((b.lng - a.lng) * Math.PI) / 180;
		const sinLat = Math.sin(dLat / 2);
		const sinLng = Math.sin(dLng / 2);
		const h = sinLat * sinLat +
			Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
		return 2 * R * Math.asin(Math.sqrt(h));
	}

	/** @param {any[]} track */
	function trackDistance(track) {
		let total = 0;
		for (let i = 1; i < track.length; i++) total += haversine(track[i - 1], track[i]);
		return total;
	}

	/** @param {number} minPerKm */
	function formatPace(minPerKm) {
		const mm = Math.floor(minPerKm);
		const s = Math.round((minPerKm - mm) * 60);
		return `${mm}:${s.toString().padStart(2, '0')} /km`;
	}

	/** @type {Record<number, any>} */
	let maps = {};

	/**
	 * @param {any[]} track @param {number} idx
	 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function renderMap(track, idx) {
		return (node) => {
			initMapForTrack(node, track, idx);
			return () => {
				if (maps[idx]) { maps[idx].remove(); delete maps[idx]; }
			};
		};
	}

	/** @param {HTMLElement} node @param {any[]} track @param {number} idx */
	async function initMapForTrack(node, track, idx) {
		const L = await import('leaflet');
		if (!node.isConnected) return;
		const map = L.map(node, { attributionControl: false, zoomControl: false });
		L.tileLayer(TILE_URL.karte, { maxZoom: 19 }).addTo(map);
		const pts = track.map((/** @type {any} */ p) => /** @type {[number, number]} */ ([p.lat, p.lng]));
		L.polyline(pts, { color: ROUTE_CASING, weight: 7, opacity: 0.9 }).addTo(map);
		const polyline = L.polyline(pts, { color: ROUTE_COLOR, weight: 3.5 }).addTo(map);
		L.circleMarker(pts[0], { radius: 5, fillColor: '#a3be8c', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
		L.circleMarker(pts[pts.length - 1], { radius: 5, fillColor: '#bf616a', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
		map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
		maps[idx] = map;
	}

	/** @param {any[]} track */
	function computeSplits(track) {
		if (track.length < 2) return [];
		/** @type {Array<{km: number, pace: number, elapsed: number}>} */
		const splits = [];
		let cumDist = 0;
		let splitStartTime = track[0].timestamp;
		for (let i = 1; i < track.length; i++) {
			cumDist += haversine(track[i - 1], track[i]);
			const currentKm = Math.floor(cumDist);
			const prevKm = splits.length;
			if (currentKm > prevKm) {
				const elapsedMin = (track[i].timestamp - splitStartTime) / 60000;
				const segDist = cumDist - prevKm;
				const pace = segDist > 0 ? elapsedMin / segDist : 0;
				splits.push({ km: currentKm, pace, elapsed: (track[i].timestamp - track[0].timestamp) / 60000 });
				splitStartTime = track[i].timestamp;
			}
		}
		const lastKm = splits.length;
		const partialDist = cumDist - lastKm;
		if (partialDist > 0.05) {
			const elapsedMin = (track[track.length - 1].timestamp - splitStartTime) / 60000;
			splits.push({
				km: cumDist,
				pace: elapsedMin / partialDist,
				elapsed: (track[track.length - 1].timestamp - track[0].timestamp) / 60000
			});
		}
		return splits;
	}

	/** @param {any[]} track */
	function computePaceSamples(track) {
		if (track.length < 2) return [];
		/** @type {Array<{dist: number, pace: number}>} */
		const samples = [];
		let cumDist = 0;
		const windowDist = 0.2;
		for (let i = 1; i < track.length; i++) {
			cumDist += haversine(track[i - 1], track[i]);
			let backDist = 0;
			let j = i;
			while (j > 0 && backDist < windowDist) { backDist += haversine(track[j - 1], track[j]); j--; }
			if (backDist < 0.05) continue;
			const dt = (track[i].timestamp - track[j].timestamp) / 60000;
			const pace = dt / backDist;
			if (pace > 0 && pace < 30) samples.push({ dist: cumDist, pace });
		}
		return samples;
	}

	/** @param {any[]} track */
	function computeElevationSamples(track) {
		/** @type {Array<{dist: number, altitude: number}>} */
		const samples = [];
		let cumDist = 0;
		for (let i = 0; i < track.length; i++) {
			if (track[i].altitude == null) continue;
			if (i > 0) cumDist += haversine(track[i - 1], track[i]);
			samples.push({ dist: cumDist, altitude: track[i].altitude });
		}
		return samples;
	}

	/** @param {Array<{dist: number, altitude: number}>} samples */
	function computeElevationStats(samples) {
		return computeElevationStatsShared(samples);
	}

	/** @param {Array<{dist: number, pace: number}>} samples */
	function buildPaceChartData(samples) {
		const step = Math.max(1, Math.floor(samples.length / 50));
		const filtered = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
		const primary = dark ? '#88C0D0' : '#5E81AC';
		const fill = dark ? 'rgba(136, 192, 208, 0.12)' : 'rgba(94, 129, 172, 0.12)';
		return {
			labels: filtered.map(s => s.dist.toFixed(2)),
			datasets: [{ label: 'Pace', data: filtered.map(s => s.pace), borderColor: primary, backgroundColor: fill, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }]
		};
	}

	/** @param {Array<{dist: number, altitude: number}>} samples */
	function buildElevationChartData(samples) {
		const step = Math.max(1, Math.floor(samples.length / 80));
		const filtered = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
		const color = dark ? '#A3BE8C' : '#8FBCBB';
		const fill = dark ? 'rgba(163, 190, 140, 0.18)' : 'rgba(143, 188, 187, 0.18)';
		return {
			labels: filtered.map(s => s.dist.toFixed(2)),
			datasets: [{ label: t.elevation, data: filtered.map(s => Math.round(s.altitude)), borderColor: color, backgroundColor: fill, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }]
		};
	}

	/** @param {any[]} track */
	function computeCadenceSamples(track) {
		/** @type {Array<{dist: number, cadence: number}>} */
		const samples = [];
		let cumDist = 0;
		for (let i = 0; i < track.length; i++) {
			if (track[i].cadence == null) continue;
			if (i > 0) cumDist += haversine(track[i - 1], track[i]);
			samples.push({ dist: cumDist, cadence: Math.round(track[i].cadence) });
		}
		return samples;
	}

	/** @param {Array<{dist: number, cadence: number}>} samples */
	function buildCadenceChartData(samples) {
		const step = Math.max(1, Math.floor(samples.length / 50));
		const filtered = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
		const color = dark ? '#B48EAD' : '#5E81AC';
		const fill = dark ? 'rgba(180, 142, 173, 0.12)' : 'rgba(94, 129, 172, 0.12)';
		return {
			labels: filtered.map(s => s.dist.toFixed(2)),
			datasets: [{ label: t.cadence, data: filtered.map(s => s.cadence), borderColor: color, backgroundColor: fill, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }]
		};
	}
</script>

<div class="run-detail">
	<div class="stats-row">
		{#if session.duration}
			<div class="stat-pill"><Clock size={14} /><span>{formatDuration(session.duration)}</span></div>
		{/if}
		{#if session.totalVolume}
			<div class="stat-pill"><Weight size={14} /><span>{Math.round(session.totalVolume).toLocaleString()} kg</span></div>
		{/if}
		{#if kcalResult}
			<div class="stat-pill kcal has-info">
				<Flame size={14} />
				<span>{kcalResult.kcal} &plusmn; {kcalResult.kcal - kcalResult.lower} kcal</span>
				<button class="kcal-info-trigger" onclick={() => showKcalInfo = !showKcalInfo} aria-label="Show estimation sources">
					<Info size={12} />
				</button>
				{#if showKcalInfo}
					<div class="kcal-info-tooltip">
						{#each kcalResult.methods as method (method)}
							{@const cite = METHOD_CITATIONS[method]}
							{#if cite}
								<span class="cite-line">
									{#if cite.doi}
										<a href="https://doi.org/{cite.doi}" target="_blank" rel="noopener">{cite.label}</a>
									{:else}{cite.label}{/if}
								</span>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		{#if showPrs && session.prs?.length > 0}
			<div class="stat-pill pr"><Trophy size={14} /><span>{session.prs.length} PR{session.prs.length !== 1 ? 's' : ''}</span></div>
		{/if}
	</div>

	{#each session.exercises as ex, exIdx (ex.exerciseId + '-' + exIdx)}
		{@const exercise = getExerciseById(ex.exerciseId)}
		{@const metrics = getExerciseMetrics(exercise)}
		{@const mainMetrics = metrics.filter((/** @type {string} */ mm) => mm !== 'rpe')}
		{@const showEst1rm = isStrength(ex.exerciseId)}
		<div class="exercise-block">
			<h3 class="exercise-title"><ExerciseName exerciseId={ex.exerciseId} /></h3>
			<table class="sets-table">
				<thead>
					<tr>
						<th>{t.set_header}</th>
						{#each mainMetrics as metric (metric)}<th>{METRIC_LABELS[metric]}</th>{/each}
						<th>RPE</th>
						{#if showEst1rm}<th>{t.est_1rm}</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each ex.sets as set, i (i)}
						<tr>
							<td class="set-num">{i + 1}</td>
							{#each mainMetrics as metric (metric)}<td>{set[metric] ?? '—'}</td>{/each}
							<td class="rpe">{set.rpe ?? '—'}</td>
							{#if showEst1rm}<td class="est1rm">{set.weight && set.reps ? epley1rm(set.weight, set.reps) : '—'}</td>{/if}
						</tr>
					{/each}
				</tbody>
			</table>

			{#if ex.gpsTrack?.length > 0}
				{@const dist = ex.totalDistance ?? trackDistance(ex.gpsTrack)}
				{@const elapsed = (ex.gpsTrack[ex.gpsTrack.length - 1].timestamp - ex.gpsTrack[0].timestamp) / 60000}
				{@const pace = dist > 0 && elapsed > 0 ? elapsed / dist : 0}
				{@const elevSamples = computeElevationSamples(ex.gpsTrack)}
				{@const elevStats = elevSamples.length > 1 ? computeElevationStats(elevSamples) : null}
				<div class="gps-track-section">
					<div class="gps-stats">
						<span class="gps-stat accent"><Route size={14} /> {dist.toFixed(2)} km</span>
						{#if pace > 0}<span class="gps-stat accent"><Gauge size={14} /> {formatPace(pace)}</span>{/if}
						{#if elevStats}
							<span class="gps-stat elev-gain"><Mountain size={14} /> +{elevStats.gain}{t.elevation_unit}</span>
							<span class="gps-stat elev-loss">-{elevStats.loss}{t.elevation_unit}</span>
						{/if}
					</div>
					<div class="track-map" {@attach renderMap(ex.gpsTrack, exIdx)}></div>

					{#if ex.gpsTrack.length >= 2}
						{@const samples = computePaceSamples(ex.gpsTrack)}
						{@const splits = computeSplits(ex.gpsTrack)}
						{#if elevSamples.length > 1}
							<div class="chart-section">
								<FitnessChart data={buildElevationChartData(elevSamples)} title="{t.elevation} ({t.elevation_unit})" height="160px" yUnit="m" />
							</div>
						{/if}
						{#if samples.length > 0}
							<div class="chart-section">
								<FitnessChart data={buildPaceChartData(samples)} title="Pace (min/km)" height="180px" />
							</div>
						{/if}
						{@const cadenceSamples = computeCadenceSamples(ex.gpsTrack)}
						{#if cadenceSamples.length > 1}
							{@const avgCadence = Math.round(cadenceSamples.reduce((a, s) => a + s.cadence, 0) / cadenceSamples.length)}
							<div class="chart-section">
								<FitnessChart data={buildCadenceChartData(cadenceSamples)} title="{t.cadence} ({t.cadence_unit}) · {t.avg} {avgCadence}" height="160px" yUnit=" spm" />
							</div>
						{/if}
						{#if splits.length > 1}
							{@const avgPace = splits.reduce((a, s) => a + s.pace, 0) / splits.length}
							<div class="splits-section">
								<h4>{t.splits}</h4>
								<table class="splits-table">
									<thead><tr><th>KM</th><th>{t.pace}</th><th>TIME</th></tr></thead>
									<tbody>
										{#each splits as split, i (i)}
											{@const isFull = split.km === Math.floor(split.km)}
											<tr class:partial={!isFull}>
												<td class="split-km">{isFull ? split.km : split.km.toFixed(2)}</td>
												<td class="split-pace" class:fast={split.pace < avgPace * 0.97} class:slow={split.pace > avgPace * 1.03}>{formatPace(split.pace)}</td>
												<td class="split-elapsed">{Math.floor(split.elapsed)}:{Math.round((split.elapsed % 1) * 60).toString().padStart(2, '0')}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	{/each}

	{#if showPrs && session.prs?.length > 0}
		<div class="prs-section">
			<h2>{t.personal_records}</h2>
			<div class="pr-list">
				{#each session.prs as pr (pr.exerciseId + pr.type)}
					{@const exercise = getExerciseById(pr.exerciseId, lang)}
					<div class="pr-item">
						<Trophy size={14} class="pr-icon" />
						<span class="pr-exercise">{exercise?.localName ?? pr.exerciseId}</span>
						<span class="pr-type">
							{#if pr.type === 'est1rm'}Est. 1RM
							{:else if pr.type === 'maxWeight'}Max Weight
							{:else if pr.type === 'bestSetVolume'}Best Set Volume
							{:else if pr.type === 'repMax'}{pr.reps}-rep max
							{:else if pr.type === 'longestDistance'}Longest Distance
							{:else if pr.type.startsWith('fastestPace:')}Fastest Pace ({formatPaceRangeLabel(pr.type)})
							{:else}{pr.type}{/if}
						</span>
						<span class="pr-value">
							{#if pr.type === 'longestDistance'}{pr.value} km
							{:else if pr.type.startsWith('fastestPace:')}{formatPaceValue(pr.value)}
							{:else}{pr.value} kg{/if}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if session.notes}
		<div class="notes-section">
			<h2>{t.notes}</h2>
			<p>{session.notes}</p>
		</div>
	{/if}
</div>

<style>
	.run-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.stats-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		background: var(--color-surface);
		border-radius: 20px;
		box-shadow: var(--shadow-sm);
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.stat-pill.kcal {
		color: var(--nord12);
		border-color: var(--nord12);
		background: color-mix(in srgb, var(--nord12) 10%, transparent);
	}
	.stat-pill.has-info { position: relative; }
	.kcal-info-trigger {
		display: flex;
		align-items: center;
		opacity: 0.5;
		cursor: pointer;
		margin-left: 0.15rem;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
	}
	.kcal-info-trigger:hover { opacity: 0.9; }
	.kcal-info-tooltip {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.35rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border, var(--nord3));
		border-radius: 8px;
		padding: 0.45rem 0.6rem;
		font-size: 0.65rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.kcal-info-tooltip a { color: var(--nord12); text-decoration: underline; }
	.stat-pill.pr {
		color: var(--nord13);
		border-color: var(--nord13);
		background: color-mix(in srgb, var(--nord13) 10%, transparent);
	}
	.exercise-block {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.exercise-title { margin: 0 0 0.5rem; font-size: 0.95rem; }
	.sets-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
	.sets-table th {
		text-align: center;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.4rem;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.sets-table td {
		text-align: center;
		padding: 0.35rem 0.4rem;
		border-top: 1px solid var(--color-border);
	}
	.set-num { font-weight: 700; color: var(--color-text-secondary); }
	.rpe { color: var(--nord12); }
	.est1rm { color: var(--color-primary); font-weight: 600; }
	.gps-track-section {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.gps-stats { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
	.gps-stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.gps-stat.accent { font-weight: 700; color: var(--color-primary); }
	.gps-stat.elev-gain { color: var(--nord14); font-weight: 600; }
	.gps-stat.elev-loss { color: var(--nord11); font-weight: 600; font-size: 0.8rem; }
	.track-map { height: 200px; border-radius: 8px; overflow: hidden; }
	.chart-section { margin-top: 0.25rem; }
	.splits-section { margin-top: 0.25rem; }
	.splits-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.splits-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
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
	.split-km { font-weight: 600; color: var(--color-text-secondary); }
	.split-pace.fast { color: var(--nord14); }
	.split-pace.slow { color: var(--nord12); }
	tr.partial .split-km { font-style: italic; opacity: 0.7; }
	.split-elapsed { color: var(--color-text-secondary); font-size: 0.75rem; }
	.prs-section {
		background: color-mix(in srgb, var(--nord13) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--nord13) 30%, transparent);
		border-radius: 12px;
		padding: 1rem;
	}
	.prs-section h2 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--nord13); }
	.pr-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.pr-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
	.pr-item :global(.pr-icon) { color: var(--nord13); flex-shrink: 0; }
	.pr-exercise { font-weight: 600; }
	.pr-type { color: var(--color-text-secondary); font-size: 0.75rem; }
	.pr-value { margin-left: auto; font-weight: 700; color: var(--nord13); }
	.notes-section {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.notes-section h2 { margin: 0 0 0.5rem; font-size: 1rem; }
	.notes-section p { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
