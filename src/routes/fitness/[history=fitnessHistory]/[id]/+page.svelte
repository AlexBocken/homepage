<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Clock, Weight, Trophy, Trash2, Pencil, Plus, Upload, Route, X, RefreshCw, Gauge, Flame } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const sl = $derived(fitnessSlugs(lang));
	import { getExerciseById, getExerciseMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import { estimateWorkoutKcal } from '$lib/data/kcalEstimate';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	const session = $derived(data.session);

	const kcalResult = $derived.by(() => {
		if (!session?.exercises) return null;
		/** @type {import('$lib/data/kcalEstimate').ExerciseData[]} */
		const exercises = [];
		for (const ex of session.exercises) {
			const exercise = getExerciseById(ex.exerciseId, lang);
			const metrics = getExerciseMetrics(exercise);
			if (metrics.includes('distance')) continue;
			const weightMultiplier = exercise?.bilateral ? 2 : 1;
			const sets = ex.sets
				.filter((/** @type {any} */ s) => s.completed && s.reps > 0)
				.map((/** @type {any} */ s) => ({
					weight: (s.weight ?? 0) * weightMultiplier,
					reps: s.reps ?? 0
				}));
			if (sets.length > 0) exercises.push({ exerciseId: ex.exerciseId, sets });
		}
		if (exercises.length === 0) return null;
		return estimateWorkoutKcal(exercises);
	});

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const t = document.documentElement.dataset.theme;
		if (t === 'dark') return true;
		if (t === 'light') return false;
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

	let deleting = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let recalculating = $state(false);
	let showPicker = $state(false);

	/** @type {any} */
	let editData = $state(null);

	function startEdit() {
		editData = {
			name: session.name,
			date: toLocalDate(session.startTime),
			time: toLocalTime(session.startTime),
			duration: session.duration ?? 0,
			notes: session.notes ?? '',
			exercises: session.exercises.map((/** @type {any} */ ex) => ({
				exerciseId: ex.exerciseId,
				name: ex.name,
				restTime: ex.restTime,
				sets: ex.sets.map((/** @type {any} */ s) => ({ ...s }))
			}))
		};
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		editData = null;
	}

	async function saveEdit() {
		if (!editData) return;
		saving = true;
		const startTime = new Date(`${editData.date}T${editData.time}`);
		const body = {
			name: editData.name,
			startTime: startTime.toISOString(),
			duration: editData.duration,
			notes: editData.notes,
			exercises: editData.exercises.map((/** @type {any} */ ex) => ({
				exerciseId: ex.exerciseId,
				name: ex.name,
				restTime: ex.restTime,
				sets: ex.sets
			}))
		};
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				editing = false;
				editData = null;
				await invalidateAll();
			}
		} catch {}
		saving = false;
	}

	/** @param {string} exerciseId */
	function addExerciseToEdit(exerciseId) {
		const exercise = getExerciseById(exerciseId, lang);
		editData.exercises = [
			...editData.exercises,
			{
				exerciseId,
				name: exercise?.localName ?? exerciseId,
				restTime: 120,
				sets: [{ completed: true }]
			}
		];
	}

	/** @param {number} exIdx */
	function removeExerciseFromEdit(exIdx) {
		editData.exercises = editData.exercises.filter((/** @type {any} */ _e, /** @type {number} */ i) => i !== exIdx);
	}

	/** @param {number} exIdx */
	function addSetToEdit(exIdx) {
		editData.exercises[exIdx].sets = [...editData.exercises[exIdx].sets, { completed: true }];
	}

	/**
	 * @param {number} exIdx
	 * @param {number} setIdx
	 */
	function removeSetFromEdit(exIdx, setIdx) {
		editData.exercises[exIdx].sets = editData.exercises[exIdx].sets.filter(
			(/** @type {any} */ _s, /** @type {number} */ i) => i !== setIdx
		);
	}

	/**
	 * @param {number} exIdx
	 * @param {number} setIdx
	 * @param {Record<string, number | null>} data
	 */
	function updateSetInEdit(exIdx, setIdx, data) {
		editData.exercises[exIdx].sets[setIdx] = {
			...editData.exercises[exIdx].sets[setIdx],
			...data
		};
	}

	/** @param {number} mins */
	function formatDuration(mins) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	/** @param {string} dateStr */
	function formatDate(dateStr) {
		const d = new Date(dateStr);
		return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	}

	/** @param {string} dateStr */
	function formatTime(dateStr) {
		const d = new Date(dateStr);
		return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	/** @param {string} dateStr */
	function toLocalDate(dateStr) {
		const d = new Date(dateStr);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	/** @param {string} dateStr */
	function toLocalTime(dateStr) {
		const d = new Date(dateStr);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	/** @param {number} weight @param {number} reps */
	function epley1rm(weight, reps) {
		if (reps <= 0 || weight <= 0) return 0;
		if (reps === 1) return weight;
		return Math.round(weight * (1 + reps / 30));
	}

	async function recalculate() {
		recalculating = true;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}/recalculate`, { method: 'POST' });
			if (res.ok) {
				await invalidateAll();
			}
		} catch {}
		recalculating = false;
	}

	async function deleteSession() {
		if (!confirm(t('delete_session_confirm', lang))) return;
		deleting = true;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto(`/fitness/${sl.history}`);
			}
		} catch {}
		deleting = false;
	}

	/** @param {string} exerciseId */
	function isStrength(exerciseId) {
		const exercise = getExerciseById(exerciseId);
		const metrics = getExerciseMetrics(exercise);
		return metrics.includes('weight') && metrics.includes('reps');
	}

	/** @param {string} exerciseId */
	function isCardio(exerciseId) {
		const exercise = getExerciseById(exerciseId);
		return exercise?.bodyPart === 'cardio';
	}

	/** @type {Record<number, any>} */
	let maps = {};
	let uploading = $state(-1);

	/** Haversine distance in km */
	function haversine(/** @type {any} */ a, /** @type {any} */ b) {
		const R = 6371;
		const dLat = ((b.lat - a.lat) * Math.PI) / 180;
		const dLng = ((b.lng - a.lng) * Math.PI) / 180;
		const sinLat = Math.sin(dLat / 2);
		const sinLng = Math.sin(dLng / 2);
		const h = sinLat * sinLat +
			Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
			sinLng * sinLng;
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
		const m = Math.floor(minPerKm);
		const s = Math.round((minPerKm - m) * 60);
		return `${m}:${s.toString().padStart(2, '0')} /km`;
	}

	/**
	 * Svelte use:action — renders a Leaflet map for a GPS track
	 * @param {HTMLElement} node
	 * @param {any} params
	 */
	function renderMap(node, params) {
		const { track, idx } = params;
		initMapForTrack(node, track, idx);
		return {
			destroy() {
				if (maps[idx]) {
					maps[idx].remove();
					delete maps[idx];
				}
			}
		};
	}

	/** @param {HTMLElement} node @param {any[]} track @param {number} idx */
	async function initMapForTrack(node, track, idx) {
		const L = await import('leaflet');
		if (!node.isConnected) return;
		const map = L.map(node, { attributionControl: false, zoomControl: false });
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
		const pts = track.map((/** @type {any} */ p) => /** @type {[number, number]} */ ([p.lat, p.lng]));
		const polyline = L.polyline(pts, { color: '#5e81ac', weight: 3 }).addTo(map);
		// Start/end markers
		L.circleMarker(pts[0], { radius: 5, fillColor: '#a3be8c', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
		L.circleMarker(pts[pts.length - 1], { radius: 5, fillColor: '#bf616a', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
		map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
		maps[idx] = map;
	}

	/**
	 * Compute km splits from a GPS track.
	 * Returns array of { km, pace (min/km), elapsed (min) }
	 * @param {any[]} track
	 */
	function computeSplits(track) {
		if (track.length < 2) return [];
		/** @type {Array<{km: number, pace: number, elapsed: number}>} */
		const splits = [];
		let cumDist = 0;
		let splitStart = 0; // index where current km started
		let splitStartTime = track[0].timestamp;

		for (let i = 1; i < track.length; i++) {
			cumDist += haversine(track[i - 1], track[i]);
			const currentKm = Math.floor(cumDist);
			const prevKm = splits.length;

			if (currentKm > prevKm) {
				// We crossed a km boundary
				const elapsedMin = (track[i].timestamp - splitStartTime) / 60000;
				// Distance covered in this segment (might be slightly over 1km)
				const segDist = cumDist - prevKm;
				const pace = segDist > 0 ? elapsedMin / segDist : 0;
				splits.push({
					km: currentKm,
					pace,
					elapsed: (track[i].timestamp - track[0].timestamp) / 60000
				});
				splitStart = i;
				splitStartTime = track[i].timestamp;
			}
		}

		// Final partial km
		const lastKm = splits.length;
		const partialDist = cumDist - lastKm;
		if (partialDist > 0.05) { // only show if > 50m
			const elapsedMin = (track[track.length - 1].timestamp - splitStartTime) / 60000;
			const pace = elapsedMin / partialDist;
			splits.push({
				km: cumDist,
				pace,
				elapsed: (track[track.length - 1].timestamp - track[0].timestamp) / 60000
			});
		}

		return splits;
	}

	/**
	 * Compute rolling pace samples for the pace graph.
	 * Returns array of { dist (km), pace (min/km) } sampled every ~100m.
	 * @param {any[]} track
	 */
	function computePaceSamples(track) {
		if (track.length < 2) return [];
		/** @type {Array<{dist: number, pace: number}>} */
		const samples = [];
		let cumDist = 0;
		const windowDist = 0.2; // 200m rolling window

		for (let i = 1; i < track.length; i++) {
			cumDist += haversine(track[i - 1], track[i]);

			// Find point ~windowDist km back
			let backDist = 0;
			let j = i;
			while (j > 0 && backDist < windowDist) {
				backDist += haversine(track[j - 1], track[j]);
				j--;
			}
			if (backDist < 0.05) continue; // too little distance

			const dt = (track[i].timestamp - track[j].timestamp) / 60000;
			const pace = dt / backDist;
			if (pace > 0 && pace < 30) { // sanity: max 30 min/km
				samples.push({ dist: cumDist, pace });
			}
		}
		return samples;
	}

	/**
	 * Build Chart.js data for pace over distance
	 * @param {Array<{dist: number, pace: number}>} samples
	 */
	function buildPaceChartData(samples) {
		// Downsample to ~50 points for readability
		const step = Math.max(1, Math.floor(samples.length / 50));
		const filtered = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
		const primary = dark ? '#88C0D0' : '#5E81AC';
		const fill = dark ? 'rgba(136, 192, 208, 0.12)' : 'rgba(94, 129, 172, 0.12)';
		return {
			labels: filtered.map(s => s.dist.toFixed(2)),
			datasets: [{
				label: 'Pace',
				data: filtered.map(s => s.pace),
				borderColor: primary,
				backgroundColor: fill,
				borderWidth: 1.5,
				pointRadius: 0,
				tension: 0.3,
				fill: true
			}]
		};
	}

	/** @param {number} exIdx */
	async function uploadGpx(exIdx) {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.gpx';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			uploading = exIdx;
			const fd = new FormData();
			fd.append('gpx', file);
			fd.append('exerciseIdx', String(exIdx));
			try {
				const res = await fetch(`/api/fitness/sessions/${session._id}/gpx`, {
					method: 'POST',
					body: fd
				});
				if (res.ok) {
					await invalidateAll();
				}
			} catch {}
			uploading = -1;
		};
		input.click();
	}

	/** @param {number} exIdx */
	async function removeGpx(exIdx) {
		if (!confirm(t('remove_gps_confirm', lang))) return;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}/gpx`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseIdx: exIdx })
			});
			if (res.ok) {
				await invalidateAll();
			}
		} catch {}
	}
</script>

<svelte:head>
	<title>{session?.name ?? (lang === 'en' ? 'Workout' : 'Training')} - Fitness</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="session-detail">
	<div class="detail-header">
		<div>
			{#if editing}
				<input class="edit-name-input" type="text" bind:value={editData.name} />
			{:else}
				<h1>{session.name}</h1>
			{/if}
			<p class="session-date">{formatDate(session.startTime)} · {formatTime(session.startTime)}</p>
		</div>
		<div class="header-actions">
			{#if editing}
				<button class="recalc-btn" onclick={recalculate} disabled={recalculating} title={t('recalc_title', lang)}>
					<RefreshCw size={14} class={recalculating ? 'spinning' : ''} />
				</button>
				<button class="save-btn" onclick={saveEdit} disabled={saving}>
					{saving ? t('saving', lang).toUpperCase() : t('save', lang).toUpperCase()}
				</button>
				<button class="cancel-edit-btn" onclick={cancelEdit}>{t('cancel', lang)}</button>
			{:else}
				<button class="edit-btn" onclick={startEdit} aria-label="Edit session">
					<Pencil size={16} />
				</button>
				<button class="delete-btn" onclick={deleteSession} disabled={deleting} aria-label="Delete session">
					<Trash2 size={18} />
				</button>
			{/if}
		</div>
	</div>

	{#if editing}
		<div class="edit-meta">
			<div class="meta-row">
				<label for="edit-date">{t('date', lang)}</label>
				<input id="edit-date" type="date" bind:value={editData.date} />
			</div>
			<div class="meta-row">
				<label for="edit-time">{t('time', lang)}</label>
				<input id="edit-time" type="time" bind:value={editData.time} />
			</div>
			<div class="meta-row">
				<label for="edit-duration">{t('duration_min', lang)}</label>
				<input id="edit-duration" type="number" min="0" bind:value={editData.duration} />
			</div>
			<div class="meta-row">
				<label for="edit-notes">{t('notes', lang)}</label>
				<textarea id="edit-notes" bind:value={editData.notes} rows="2" placeholder={t('notes_placeholder', lang)}></textarea>
			</div>
		</div>
	{:else}
		<div class="stats-row">
			{#if session.duration}
				<div class="stat-pill">
					<Clock size={14} />
					<span>{formatDuration(session.duration)}</span>
				</div>
			{/if}
			{#if session.totalVolume}
				<div class="stat-pill">
					<Weight size={14} />
					<span>{Math.round(session.totalVolume).toLocaleString()} kg</span>
				</div>
			{/if}
			{#if kcalResult}
				<div class="stat-pill kcal">
					<Flame size={14} />
					<span>{kcalResult.kcal} &plusmn; {kcalResult.kcal - kcalResult.lower} kcal</span>
				</div>
			{/if}
			{#if session.prs?.length > 0}
				<div class="stat-pill pr">
					<Trophy size={14} />
					<span>{session.prs.length} PR{session.prs.length !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if editing}
		{#each editData.exercises as ex, exIdx (exIdx)}
			<div class="exercise-block">
				<div class="exercise-header">
					<ExerciseName exerciseId={ex.exerciseId} />
					<button
						class="remove-exercise"
						onclick={() => removeExerciseFromEdit(exIdx)}
						aria-label="Remove exercise"
					>
						<Trash2 size={16} />
					</button>
				</div>

				{#if session.exercises[exIdx]?.gpsTrack?.length || session.exercises[exIdx]?.gpsPreview?.length}
					{@const exData = session.exercises[exIdx]}
					<div class="gps-indicator">
						<Route size={14} />
						<span>{t('gps_track_stored', lang)}{exData.totalDistance ? ` · ${exData.totalDistance.toFixed(2)} km` : ''}</span>
						<button class="gpx-remove-btn" onclick={() => removeGpx(exIdx)} aria-label="Remove GPS track">
							<X size={14} />
						</button>
					</div>
					{#if exData.gpsTrack?.length >= 2}
						<div class="track-map" use:renderMap={{ track: exData.gpsTrack, idx: exIdx }}></div>
					{/if}
				{/if}

				<SetTable
					sets={ex.sets}
					metrics={getExerciseMetrics(getExerciseById(ex.exerciseId))}
					editable={true}
					onUpdate={(setIdx, d) => updateSetInEdit(exIdx, setIdx, d)}
					onToggleComplete={(setIdx) => {
						ex.sets[setIdx].completed = !ex.sets[setIdx].completed;
					}}
					onRemove={(setIdx) => removeSetFromEdit(exIdx, setIdx)}
				/>

				<button class="add-set-btn" onclick={() => addSetToEdit(exIdx)}>
					{t('add_set', lang)}
				</button>
			</div>
		{/each}

		<button class="add-exercise-btn" onclick={() => showPicker = true}>
			<Plus size={18} /> {t('add_exercise', lang)}
		</button>
	{:else}
		{#each session.exercises as ex, exIdx (ex.exerciseId + '-' + exIdx)}
			{@const exercise = getExerciseById(ex.exerciseId)}
			{@const metrics = getExerciseMetrics(exercise)}
			{@const mainMetrics = metrics.filter((/** @type {string} */ m) => m !== 'rpe')}
			{@const showEst1rm = isStrength(ex.exerciseId)}
			<div class="exercise-block">
				<h3 class="exercise-title">
					<ExerciseName exerciseId={ex.exerciseId} />
				</h3>
				<table class="sets-table">
					<thead>
						<tr>
							<th>{t('set_header', lang)}</th>
							{#each mainMetrics as metric (metric)}
								<th>{METRIC_LABELS[metric]}</th>
							{/each}
							<th>RPE</th>
							{#if showEst1rm}
								<th>{t('est_1rm', lang)}</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each ex.sets as set, i (i)}
							<tr>
								<td class="set-num">{i + 1}</td>
								{#each mainMetrics as metric (metric)}
									<td>{set[metric] ?? '—'}</td>
								{/each}
								<td class="rpe">{set.rpe ?? '—'}</td>
								{#if showEst1rm}
									<td class="est1rm">{set.weight && set.reps ? epley1rm(set.weight, set.reps) : '—'}</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>

				{#if ex.gpsTrack?.length > 0}
					{@const dist = ex.totalDistance ?? trackDistance(ex.gpsTrack)}
					{@const elapsed = (ex.gpsTrack[ex.gpsTrack.length - 1].timestamp - ex.gpsTrack[0].timestamp) / 60000}
					{@const pace = dist > 0 && elapsed > 0 ? elapsed / dist : 0}
					<div class="gps-track-section">
						<div class="gps-stats">
							<span class="gps-stat accent"><Route size={14} /> {dist.toFixed(2)} km</span>
							{#if pace > 0}
								<span class="gps-stat accent"><Gauge size={14} /> {formatPace(pace)}</span>
							{/if}
						</div>
						<div class="track-map" use:renderMap={{ track: ex.gpsTrack, idx: exIdx }}></div>

						{#if ex.gpsTrack.length >= 2}
						{@const samples = computePaceSamples(ex.gpsTrack)}
						{@const splits = computeSplits(ex.gpsTrack)}
						{#if samples.length > 0}
							<div class="pace-chart-section">
								<FitnessChart
									data={buildPaceChartData(samples)}
									title="Pace (min/km)"
									height="180px"
								/>
							</div>
						{/if}

						{#if splits.length > 1}
							{@const avgPace = splits.reduce((a, s) => a + s.pace, 0) / splits.length}
							<div class="splits-section">
								<h4>{t('splits', lang)}</h4>
								<table class="splits-table">
									<thead>
										<tr>
											<th>KM</th>
											<th>{t('pace', lang)}</th>
											<th>TIME</th>
										</tr>
									</thead>
									<tbody>
										{#each splits as split, i (i)}
											{@const isFull = split.km === Math.floor(split.km)}
											<tr class:partial={!isFull}>
												<td class="split-km">{isFull ? split.km : split.km.toFixed(2)}</td>
												<td class="split-pace" class:fast={split.pace < avgPace * 0.97} class:slow={split.pace > avgPace * 1.03}>
													{formatPace(split.pace)}
												</td>
												<td class="split-elapsed">{Math.floor(split.elapsed)}:{Math.round((split.elapsed % 1) * 60).toString().padStart(2, '0')}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
						{/if}
					</div>
				{:else if isCardio(ex.exerciseId)}
					<button class="gpx-upload-btn" onclick={() => uploadGpx(exIdx)} disabled={uploading === exIdx}>
						<Upload size={14} />
						{uploading === exIdx ? t('uploading', lang) : t('upload_gpx', lang)}
					</button>
				{/if}
			</div>
		{/each}
	{/if}

	{#if !editing && session.prs?.length > 0}
		<div class="prs-section">
			<h2>{t('personal_records', lang)}</h2>
			<div class="pr-list">
				{#each session.prs as pr (pr.exerciseId + pr.type)}
					{@const exercise = getExerciseById(pr.exerciseId, lang)}
					<div class="pr-item">
						<Trophy size={14} class="pr-icon" />
						<span class="pr-exercise">{exercise?.localName ?? pr.exerciseId}</span>
						<span class="pr-type">
							{#if pr.type === 'est1rm'}Est. 1RM
							{:else if pr.type === 'maxWeight'}Max Weight
							{:else if pr.type === 'repMax'}{pr.reps}-rep max
							{:else}{pr.type}{/if}
						</span>
						<span class="pr-value">{pr.value} kg</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if !editing && session.notes}
		<div class="notes-section">
			<h2>{t('notes', lang)}</h2>
			<p>{session.notes}</p>
		</div>
	{/if}
</div>

{#if showPicker}
	<ExercisePicker
		onSelect={(id) => { addExerciseToEdit(id); showPicker = false; }}
		onClose={() => showPicker = false}
	/>
{/if}

<style>
	.session-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.session-date {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.header-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}
	.edit-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.4rem;
		display: flex;
	}
	.edit-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.recalc-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.4rem;
		display: flex;
		align-items: center;
	}
	.recalc-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.recalc-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	:global(.spinning) {
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.delete-btn {
		background: none;
		border: 1px solid var(--nord11);
		border-radius: 8px;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.4rem;
		display: flex;
		opacity: 0.7;
	}
	.delete-btn:hover {
		opacity: 1;
	}
	.delete-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.save-btn {
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.4rem 1rem;
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.cancel-edit-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		padding: 0.4rem 1rem;
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.cancel-edit-btn:hover {
		border-color: var(--color-text-primary);
		color: var(--color-text-primary);
	}

	.edit-name-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: inherit;
		font-size: 1.4rem;
		font-weight: 700;
		padding: 0.2rem 0;
		width: 100%;
		outline: none;
	}
	.edit-name-input:focus {
		border-bottom-color: var(--color-primary);
	}
	.edit-meta {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.meta-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.meta-row label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		min-width: 7rem;
	}
	.meta-row input,
	.meta-row textarea {
		flex: 1;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.4rem 0.5rem;
		font-size: 0.85rem;
		color: inherit;
	}
	.meta-row textarea {
		resize: vertical;
		font-family: inherit;
	}
	.meta-row input:focus,
	.meta-row textarea:focus {
		outline: none;
		border-color: var(--color-primary);
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
	.exercise-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.exercise-title {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
	}
	.remove-exercise {
		background: none;
		border: none;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.25rem;
		opacity: 0.6;
	}
	.remove-exercise:hover {
		opacity: 1;
	}
	.gps-indicator {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--color-primary);
		padding: 0.3rem 0.5rem;
		margin-bottom: 0.3rem;
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
		border-radius: 6px;
	}
	.add-set-btn {
		display: block;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.4rem;
		background: transparent;
		border: 1px dashed var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.add-set-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.add-exercise-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.75rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}

	.sets-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}
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
	.set-num {
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.rpe {
		color: var(--nord12);
	}
	.est1rm {
		color: var(--color-primary);
		font-weight: 600;
	}

	.prs-section {
		background: color-mix(in srgb, var(--nord13) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--nord13) 30%, transparent);
		border-radius: 12px;
		padding: 1rem;
	}
	.prs-section h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: var(--nord13);
	}
	.pr-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.pr-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.pr-item :global(.pr-icon) {
		color: var(--nord13);
		flex-shrink: 0;
	}
	.pr-exercise {
		font-weight: 600;
	}
	.pr-type {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
	.pr-value {
		margin-left: auto;
		font-weight: 700;
		color: var(--nord13);
	}

	.notes-section {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.notes-section h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	.notes-section p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	/* GPS track section */
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
	.gpx-remove-btn {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.2rem;
		opacity: 0.5;
		display: flex;
	}
	.gpx-remove-btn:hover {
		opacity: 1;
	}
	.track-map {
		height: 200px;
		border-radius: 8px;
		overflow: hidden;
	}
	.gpx-upload-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: transparent;
		border: 1px dashed var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
	}
	.gpx-upload-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.gpx-upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Pace chart */
	.pace-chart-section {
		margin-top: 0.25rem;
	}
	.splits-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	/* Splits table */
	.splits-section {
		margin-top: 0.25rem;
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
		color: var(--nord14);
	}
	.split-pace.slow {
		color: var(--nord12);
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
