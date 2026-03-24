<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Trash2, Play, Pause, Trophy, Clock, Dumbbell, Route, RefreshCw, Check, ChevronUp, ChevronDown, Flame, MapPin } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const sl = $derived(fitnessSlugs(lang));
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import { getGpsTracker, trackDistance } from '$lib/js/gps.svelte';
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import { estimateWorkoutKcal } from '$lib/data/kcalEstimate';
	import { estimateCardioKcal } from '$lib/data/cardioKcalEstimate';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import { queueSession } from '$lib/offline/fitnessQueue';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
	import { onMount } from 'svelte';

	const workout = getWorkout();
	const sync = getWorkoutSync();
	const gps = getGpsTracker();
	let nameInput = $state(workout.name);
	let nameEditing = $state(false);
	$effect(() => { if (!nameEditing) nameInput = workout.name; });
	let showPicker = $state(false);

	/** @type {Record<string, Array<Record<string, any>>>} */
	let previousData = $state({});

	/** @type {any} */
	let completionData = $state(null);

	/** @type {any[]} */
	let templateDiffs = $state([]);
	let templateUpdateStatus = $state('idle'); // 'idle' | 'updating' | 'done'
	let offlineQueued = $state(false);

	let useGps = $state(gps.isTracking);

	/** @type {any} */
	let liveMap = null;
	/** @type {any} */
	let livePolyline = null;
	/** @type {any} */
	let liveMarker = null;
	/** @type {any} */
	let leafletLib = null;
	let prevTrackLen = 0;

	/** Svelte use:action — called when the map div enters the DOM */
	function mountMap(/** @type {HTMLElement} */ node) {
		initMap(node);
		return {
			destroy() {
				if (liveMap) {
					liveMap.remove();
					liveMap = null;
					livePolyline = null;
					liveMarker = null;
					leafletLib = null;
					prevTrackLen = 0;
				}
			}
		};
	}

	/** @param {HTMLElement} node */
	async function initMap(node) {
		leafletLib = await import('leaflet');
		if (!node.isConnected) return;
		liveMap = leafletLib.map(node, {
			attributionControl: false,
			zoomControl: false
		});
		leafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19
		}).addTo(liveMap);
		livePolyline = leafletLib.polyline([], { color: '#88c0d0', weight: 3 }).addTo(liveMap);
		liveMarker = leafletLib.circleMarker([0, 0], {
			radius: 6, fillColor: '#a3be8c', fillOpacity: 1, color: '#fff', weight: 2
		}).addTo(liveMap);

		if (gps.track.length > 0) {
			const pts = gps.track.map((/** @type {any} */ p) => [p.lat, p.lng]);
			livePolyline.setLatLngs(pts);
			liveMarker.setLatLng(pts[pts.length - 1]);
			liveMap.setView(pts[pts.length - 1], 16);
			prevTrackLen = gps.track.length;
		}
	}

	let gpsToggling = $state(false);
	async function toggleGps() {
		if (gpsToggling) return;
		gpsToggling = true;
		try {
			if (!useGps) {
				if (gps.isTracking) {
					useGps = true;
				} else {
					useGps = await gps.start();
				}
			} else {
				await gps.stop();
				useGps = false;
				if (liveMap) {
					liveMap.remove();
					liveMap = null;
					livePolyline = null;
					liveMarker = null;
				}
			}
		} finally {
			gpsToggling = false;
		}
	}

	$effect(() => {
		const len = gps.track.length;
		if (len > prevTrackLen && liveMap && gps.latestPoint) {
			// Add all new points since last update (native polling delivers batches)
			for (let i = prevTrackLen; i < len; i++) {
				const p = gps.track[i];
				livePolyline.addLatLng([p.lat, p.lng]);
			}
			const pt = [gps.latestPoint.lat, gps.latestPoint.lng];
			liveMarker.setLatLng(pt);
			const zoom = liveMap.getZoom() || 16;
			liveMap.setView(pt, zoom);
			prevTrackLen = len;
		}
	});

	/** Check if any exercise in the workout is cardio */
	function hasCardioExercise() {
		return workout.exercises.some((/** @type {any} */ e) => {
			const exercise = getExerciseById(e.exerciseId);
			return exercise?.bodyPart === 'cardio';
		});
	}

	onMount(() => {
		if (!workout.active && !completionData) {
			goto(`/fitness/${sl.workout}`);
		}
	});

	/** @param {string[]} exerciseIds */
	async function fetchPreviousData(exerciseIds) {
		const promises = exerciseIds.map(async (id) => {
			if (previousData[id]) return;
			try {
				const res = await fetch(`/api/fitness/exercises/${id}/history?limit=1`);
				if (res.ok) {
					const d = await res.json();
					if (d.history?.length > 0 && d.history[0].sets) {
						previousData[id] = d.history[0].sets;
					}
				}
			} catch {}
		});
		await Promise.all(promises);
	}

	/** @param {string} exerciseId */
	async function addExerciseFromPicker(exerciseId) {
		workout.addExercise(exerciseId);
		fetchPreviousData([exerciseId]);

		// Auto-start GPS when adding a cardio exercise
		const exercise = getExerciseById(exerciseId);
		if (exercise?.bodyPart === 'cardio' && gps.available && !useGps && !gps.isTracking) {
			useGps = await gps.start();
		}
	}

	async function finishWorkout() {
		// Stop GPS tracking and collect track data
		const gpsTrack = gps.isTracking ? await gps.stop() : [];

		const sessionData = workout.finish();
		if (sessionData.exercises.length === 0) {
			gps.reset();
			await sync.onWorkoutEnd();
			await goto(`/fitness/${sl.workout}`);
			return;
		}

		// Only save GPS points recorded while the workout timer was running
		const workoutStart = new Date(sessionData.startTime).getTime();
		const filteredTrack = gpsTrack.filter((/** @type {any} */ p) => p.timestamp >= workoutStart);
		const filteredDistance = trackDistance(filteredTrack);

		if (filteredTrack.length > 0) {
			for (const ex of sessionData.exercises) {
				const exercise = getExerciseById(ex.exerciseId);
				if (exercise?.bodyPart === 'cardio') {
					ex.gpsTrack = filteredTrack;
					ex.totalDistance = filteredDistance;
				}
			}
		}
		gps.reset();

		try {
			const res = await fetch('/api/fitness/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(sessionData)
			});
			await sync.onWorkoutEnd();
			if (res.ok) {
				const d = await res.json();
				completionData = buildCompletion(sessionData, d.session);
				computeTemplateDiff(completionData);
			} else {
				await queueSession(sessionData);
				offlineQueued = true;
				completionData = buildCompletion(sessionData, { _id: null });
			}
		} catch {
			await queueSession(sessionData);
			offlineQueued = true;
			completionData = buildCompletion(sessionData, { _id: null });
			await sync.onWorkoutEnd();
		}
	}

	/**
	 * Build the completion summary from local session data + server response
	 * @param {any} local
	 * @param {any} saved
	 */
	function buildCompletion(local, saved) {
		const startTime = new Date(local.startTime);
		const endTime = new Date(local.endTime);
		const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

		let totalTonnage = 0;
		let totalDistance = 0;
		/** @type {any[]} */
		const prs = [];

		const exerciseSummaries = local.exercises.map((/** @type {any} */ ex) => {
			const exercise = getExerciseById(ex.exerciseId, lang);
			const metrics = getExerciseMetrics(exercise);
			const isCardio = metrics.includes('distance');
			const isBilateral = exercise?.bilateral ?? false;
			const weightMul = isBilateral ? 2 : 1;
			const prev = previousData[ex.exerciseId] ?? [];

			let exTonnage = 0;
			let exDistance = 0;
			let exDuration = 0;
			let bestWeight = 0;
			let bestEst1rm = 0;
			let bestVolume = 0;
			let sets = 0;

			for (const s of ex.sets) {
				if (!s.completed) continue;
				sets++;
				if (isCardio) {
					exDistance += s.distance ?? 0;
					exDuration += s.duration ?? 0;
				} else {
					const w = (s.weight ?? 0) * weightMul;
					const r = s.reps ?? 0;
					const vol = w * r;
					exTonnage += vol;
					if (s.weight > bestWeight) bestWeight = s.weight;
					const e1rm = r > 0 && s.weight > 0 ? (r === 1 ? s.weight : Math.round(s.weight * (1 + r / 30))) : 0;
					if (e1rm > bestEst1rm) bestEst1rm = e1rm;
					if (vol > bestVolume) bestVolume = vol;
				}
			}

			totalTonnage += exTonnage;
			totalDistance += exDistance;

			// Detect PRs by comparing against previous session
			if (prev.length > 0) {
				let prevBestWeight = 0;
				let prevBestEst1rm = 0;
				let prevBestVolume = 0;
				let prevBestDistance = 0;

				for (const ps of prev) {
					if (isCardio) {
						prevBestDistance += ps.distance ?? 0;
					} else {
						const pw = ps.weight ?? 0;
						const pr = ps.reps ?? 0;
						if (pw > prevBestWeight) prevBestWeight = pw;
						const pe = pr > 0 && pw > 0 ? (pr === 1 ? pw : Math.round(pw * (1 + pr / 30))) : 0;
						if (pe > prevBestEst1rm) prevBestEst1rm = pe;
						const pv = pw * pr * (isBilateral ? 2 : 1);
						if (pv > prevBestVolume) prevBestVolume = pv;
					}
				}

				if (!isCardio) {
					if (bestWeight > prevBestWeight && prevBestWeight > 0) {
						prs.push({ exerciseId: ex.exerciseId, type: 'Max Weight', value: `${bestWeight} kg` });
					}
					if (bestEst1rm > prevBestEst1rm && prevBestEst1rm > 0) {
						prs.push({ exerciseId: ex.exerciseId, type: 'Est. 1RM', value: `${bestEst1rm} kg` });
					}
					if (bestVolume > prevBestVolume && prevBestVolume > 0) {
						prs.push({ exerciseId: ex.exerciseId, type: 'Best Set Volume', value: `${Math.round(bestVolume)} kg` });
					}
				} else {
					if (exDistance > prevBestDistance && prevBestDistance > 0) {
						prs.push({ exerciseId: ex.exerciseId, type: 'Distance', value: `${exDistance.toFixed(1)} km` });
					}
				}
			}

			const pace = isCardio && exDistance > 0 && exDuration > 0 ? exDuration / exDistance : 0;

			return {
				exerciseId: ex.exerciseId,
				sets,
				isCardio,
				tonnage: exTonnage,
				distance: exDistance,
				duration: exDuration,
				pace,
				bestWeight,
				bestEst1rm
			};
		});

		// Estimate kcal for strength + cardio exercises
		/** @type {import('$lib/data/kcalEstimate').ExerciseData[]} */
		const kcalExercises = [];
		let cardioKcal = 0;
		let cardioMarginSq = 0;
		for (const ex of local.exercises) {
			const exercise = getExerciseById(ex.exerciseId, lang);
			const metrics = getExerciseMetrics(exercise);
			if (metrics.includes('distance')) {
				let dist = 0;
				let dur = 0;
				for (const s of ex.sets) {
					if (!s.completed) continue;
					dist += s.distance ?? 0;
					dur += s.duration ?? 0;
				}
				if (dist > 0 || dur > 0) {
					const r = estimateCardioKcal(ex.exerciseId, 80, {
						distanceKm: dist || undefined,
						durationMin: dur || undefined,
					});
					cardioKcal += r.kcal;
					cardioMarginSq += (r.kcal - r.lower) ** 2;
				}
				continue;
			}
			const weightMultiplier = exercise?.bilateral ? 2 : 1;
			const sets = ex.sets
				.filter((/** @type {any} */ s) => s.completed && s.reps > 0)
				.map((/** @type {any} */ s) => ({
					weight: (s.weight ?? 0) * weightMultiplier,
					reps: s.reps ?? 0
				}));
			if (sets.length > 0) kcalExercises.push({ exerciseId: ex.exerciseId, sets });
		}
		const strengthResult = kcalExercises.length > 0 ? estimateWorkoutKcal(kcalExercises) : null;
		let kcalResult = null;
		if (strengthResult || cardioKcal > 0) {
			const total = (strengthResult?.kcal ?? 0) + cardioKcal;
			const sMargin = strengthResult ? (strengthResult.kcal - strengthResult.lower) : 0;
			const margin = Math.round(Math.sqrt(sMargin ** 2 + cardioMarginSq));
			kcalResult = {
				kcal: Math.round(total),
				lower: Math.max(0, Math.round(total) - margin),
				upper: Math.round(total) + margin,
			};
		}

		return {
			sessionId: saved._id,
			name: local.name,
			templateId: local.templateId,
			exercises: local.exercises,
			durationMin,
			totalTonnage,
			totalDistance,
			exerciseSummaries,
			prs,
			kcalResult
		};
	}

	/**
	 * Compare completed workout exercises against the source template
	 * and compute diffs for weight/reps changes.
	 * @param {any} completion
	 */
	async function computeTemplateDiff(completion) {
		if (!completion.templateId) return;
		try {
			const res = await fetch(`/api/fitness/templates/${completion.templateId}`);
			if (!res.ok) return;
			const { template } = await res.json();

			/** @type {any[]} */
			const diffs = [];
			for (const actual of completion.exercises) {
				const tmplEx = template.exercises?.find((/** @type {any} */ e) => e.exerciseId === actual.exerciseId);
				if (!tmplEx) continue;

				const exercise = getExerciseById(actual.exerciseId, lang);
				const metrics = getExerciseMetrics(exercise);
				if (metrics.includes('distance')) continue; // skip cardio

				const completedSets = actual.sets.filter((/** @type {any} */ s) => s.completed);
				if (completedSets.length === 0) continue;

				// Check if sets differ in count, reps, or weight
				const tmplSets = tmplEx.sets ?? [];
				let changed = completedSets.length !== tmplSets.length;
				if (!changed) {
					for (let i = 0; i < completedSets.length; i++) {
						const a = completedSets[i];
						const t = tmplSets[i];
						if ((a.reps ?? 0) !== (t.reps ?? 0) || (a.weight ?? 0) !== (t.weight ?? 0)) {
							changed = true;
							break;
						}
					}
				}

				if (changed) {
					diffs.push({
						exerciseId: actual.exerciseId,
						name: exercise?.localName ?? actual.exerciseId,
						oldSets: tmplSets,
						newSets: completedSets.map((/** @type {any} */ s) => ({
							reps: s.reps ?? undefined,
							weight: s.weight ?? undefined,
							rpe: s.rpe ?? undefined
						}))
					});
				}
			}
			templateDiffs = diffs;
		} catch {}
	}

	async function updateTemplate() {
		if (!completionData?.templateId || templateDiffs.length === 0) return;
		templateUpdateStatus = 'updating';
		try {
			// Fetch current template to get full data
			const res = await fetch(`/api/fitness/templates/${completionData.templateId}`);
			if (!res.ok) { templateUpdateStatus = 'idle'; return; }
			const { template } = await res.json();

			// Apply diffs to template exercises
			const updatedExercises = template.exercises.map((/** @type {any} */ ex) => {
				const diff = templateDiffs.find((/** @type {any} */ d) => d.exerciseId === ex.exerciseId);
				if (diff) {
					return { ...ex, sets: diff.newSets };
				}
				return ex;
			});

			const putRes = await fetch(`/api/fitness/templates/${completionData.templateId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: template.name, exercises: updatedExercises })
			});

			templateUpdateStatus = putRes.ok ? 'done' : 'idle';
		} catch {
			templateUpdateStatus = 'idle';
		}
	}

	/** @param {number} secs */
	function formatElapsed(secs) {
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = secs % 60;
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	/** @param {number} mins */
	function formatDuration(mins) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	/** @param {number} minPerKm */
	function formatPace(minPerKm) {
		const m = Math.floor(minPerKm);
		const s = Math.round((minPerKm - m) * 60);
		return `${m}:${s.toString().padStart(2, '0')} /km`;
	}

	function cancelRest() {
		workout.cancelRestTimer();
	}

	// Fetch previous data for existing exercises on mount
	onMount(() => {
		if (workout.active && workout.exercises.length > 0) {
			fetchPreviousData(workout.exercises.map((/** @type {any} */ e) => e.exerciseId));
		}
	});
</script>

<svelte:head>
	<title>{workout.name || (lang === 'en' ? 'Workout' : 'Training')} - Bocken</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

{#if completionData}
	<div class="completion">
		<div class="completion-header">
			<h1>{t('workout_complete', lang)}</h1>
			{#if completionData.prs.length > 0}
				<div class="pr-badge">
					<span class="pr-badge-count">{completionData.prs.length}</span>
					<Trophy size={20} />
				</div>
			{/if}
			<p class="completion-name">{completionData.name}</p>
			{#if offlineQueued}
				<p class="offline-banner">{t('workout_saved_offline', lang)}</p>
			{/if}
		</div>

		<div class="completion-stats">
			<div class="comp-stat">
				<Clock size={18} />
				<span class="comp-stat-value">{formatDuration(completionData.durationMin)}</span>
				<span class="comp-stat-label">{t('duration', lang)}</span>
			</div>
			{#if completionData.totalTonnage > 0}
				<div class="comp-stat">
					<Dumbbell size={18} />
					<span class="comp-stat-value">
						{completionData.totalTonnage >= 1000
							? `${(completionData.totalTonnage / 1000).toFixed(1)}t`
							: `${Math.round(completionData.totalTonnage)} kg`}
					</span>
					<span class="comp-stat-label">{t('tonnage', lang)}</span>
				</div>
			{/if}
			{#if completionData.totalDistance > 0}
				<div class="comp-stat">
					<Route size={18} />
					<span class="comp-stat-value">{completionData.totalDistance.toFixed(1)} km</span>
					<span class="comp-stat-label">{t('distance', lang)}</span>
				</div>
			{/if}
			{#if completionData.kcalResult}
				<div class="comp-stat kcal">
					<Flame size={18} />
					<span class="comp-stat-value">{completionData.kcalResult.kcal} &plusmn; {completionData.kcalResult.kcal - completionData.kcalResult.lower} kcal</span>
					<span class="comp-stat-label">{t('est_kcal', lang)}</span>
				</div>
			{/if}
		</div>

		{#if completionData.prs.length > 0}
			<div class="prs-section">
				<h2><Trophy size={16} /> {t('personal_records', lang)}</h2>
				<div class="pr-list">
					{#each completionData.prs as pr}
						<div class="pr-item">
							<span class="pr-exercise">{getExerciseById(pr.exerciseId, lang)?.localName ?? pr.exerciseId}</span>
							<span class="pr-detail">{pr.type}: <strong>{pr.value}</strong></span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="exercise-summaries">
			<h2>{t('exercises_heading', lang)}</h2>
			{#each completionData.exerciseSummaries as ex}
				<div class="ex-summary">
					<div class="ex-summary-header">
						<span class="ex-summary-name">{getExerciseById(ex.exerciseId, lang)?.localName ?? ex.exerciseId}</span>
						<span class="ex-summary-sets">{ex.sets} {ex.sets !== 1 ? t('sets', lang) : t('set', lang)}</span>
					</div>
					<div class="ex-summary-stats">
						{#if ex.isCardio}
							{#if ex.distance > 0}
								<span>{ex.distance.toFixed(1)} km</span>
							{/if}
							{#if ex.duration > 0}
								<span>{ex.duration} min</span>
							{/if}
							{#if ex.pace > 0}
								<span>{formatPace(ex.pace)} {t('avg', lang)}</span>
							{/if}
						{:else}
							{#if ex.tonnage > 0}
								<span>{ex.tonnage >= 1000 ? `${(ex.tonnage / 1000).toFixed(1)}t` : `${Math.round(ex.tonnage)} kg`} {t('volume', lang)}</span>
							{/if}
							{#if ex.bestWeight > 0}
								<span>Top: {ex.bestWeight} kg</span>
							{/if}
							{#if ex.bestEst1rm > 0}
								<span>e1RM: {ex.bestEst1rm} kg</span>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		</div>

		{#if templateDiffs.length > 0}
			<div class="template-update-section">
				{#if templateUpdateStatus === 'done'}
					<div class="template-updated">
						<Check size={16} />
						<span>{t('template_updated', lang)}</span>
					</div>
				{:else}
					<h2><RefreshCw size={16} /> {t('update_template', lang)}</h2>
					<p class="template-update-desc">{t('template_diff_desc', lang)}</p>
					<div class="template-diff-list">
						{#each templateDiffs as diff}
							<div class="diff-item">
								<span class="diff-name">{diff.name}</span>
								<div class="diff-sets">
									{#each diff.newSets as set, i}
										{@const old = diff.oldSets[i]}
										<div class="diff-set-row">
											{#if old}
												<span class="diff-old">{old.weight ?? '—'} kg × {old.reps ?? '—'}</span>
												<span class="diff-arrow">→</span>
											{/if}
											<span class="diff-new">{set.weight ?? '—'} kg × {set.reps ?? '—'}</span>
										</div>
									{/each}
									{#if diff.newSets.length > diff.oldSets.length}
										<div class="diff-set-row">
											<span class="diff-new">+{diff.newSets.length - diff.oldSets.length} {diff.newSets.length - diff.oldSets.length > 1 ? t('new_sets_added', lang) : t('new_set_added', lang)}</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					<button class="update-template-btn" onclick={updateTemplate} disabled={templateUpdateStatus === 'updating'}>
						{templateUpdateStatus === 'updating' ? t('updating', lang) : t('update_template', lang)}
					</button>
				{/if}
			</div>
		{/if}

		<button class="done-btn" onclick={() => goto(offlineQueued ? `/fitness/${sl.workout}` : `/fitness/${sl.history}/${completionData.sessionId}`)}>
			{offlineQueued ? t('done', lang) : t('view_workout', lang)}
		</button>
	</div>

{:else if workout.active}
	<div class="active-workout">
		<input
			class="workout-name-input"
			type="text"
			bind:value={nameInput}
			onfocus={() => { nameEditing = true; }}
			onblur={() => { nameEditing = false; workout.name = nameInput; }}
			onkeydown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
			placeholder={t('workout_name_placeholder', lang)}
		/>

		{#if gps.available && hasCardioExercise()}
			<div class="gps-section">
				<button class="gps-toggle-row" onclick={toggleGps} type="button">
					<MapPin size={14} />
					<span class="gps-toggle-track" class:checked={useGps}></span>
					<span>GPS Tracking</span>
				</button>
				{#if gpsToggling}
					<div class="gps-initializing">
						<span class="gps-spinner"></span> {t('initializing_gps', lang) ?? 'Initializing GPS…'}
					</div>
				{/if}
				{#if useGps}
					<div class="gps-bar active">
						<span class="gps-distance">{gps.distance.toFixed(2)} km</span>
						{#if gps.currentPace > 0}
							<span class="gps-pace">{Math.floor(gps.currentPace)}:{Math.round((gps.currentPace % 1) * 60).toString().padStart(2, '0')} /km</span>
						{/if}
						<span class="gps-label">{gps.track.length} pts</span>
					</div>
					<div class="live-map" use:mountMap></div>
				{/if}
			</div>
		{/if}

		{#each workout.exercises as ex, exIdx (exIdx)}
			<div class="exercise-block">
				<div class="exercise-header">
					<ExerciseName exerciseId={ex.exerciseId} />
					<div class="exercise-header-actions">
						<button class="move-exercise" disabled={exIdx === 0} onclick={() => workout.moveExercise(exIdx, -1)} aria-label="Move up">
							<ChevronUp size={16} />
						</button>
						<button class="move-exercise" disabled={exIdx === workout.exercises.length - 1} onclick={() => workout.moveExercise(exIdx, 1)} aria-label="Move down">
							<ChevronDown size={16} />
						</button>
						<button
							class="remove-exercise"
							onclick={() => workout.removeExercise(exIdx)}
							aria-label="Remove exercise"
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>

				<SetTable
					sets={ex.sets}
					previousSets={previousData[ex.exerciseId] ?? []}
					metrics={getExerciseMetrics(getExerciseById(ex.exerciseId))}
					editable={true}
					restAfterSet={workout.restTimerActive && workout.restExerciseIdx === exIdx ? workout.restSetIdx : -1}
					restSeconds={workout.restTimerSeconds}
					restTotal={workout.restTimerTotal}
					onRestAdjust={(delta) => workout.adjustRestTimer(delta)}
					onRestSkip={cancelRest}
					onUpdate={(setIdx, d) => workout.updateSet(exIdx, setIdx, d)}
					onToggleComplete={(setIdx) => {
						workout.toggleSetComplete(exIdx, setIdx);
						if (ex.sets[setIdx]?.completed) {
							workout.startRestTimer(ex.restTime, exIdx, setIdx);
						}
					}}
					onRemove={(setIdx) => workout.removeSet(exIdx, setIdx)}
				/>

				<button class="add-set-btn" onclick={() => workout.addSet(exIdx)}>
					{t('add_set', lang)}
				</button>
			</div>
		{/each}

		<div class="workout-actions">
			<button class="add-exercise-btn" onclick={() => showPicker = true}>
				{t('add_exercise', lang)}
			</button>
			<button class="cancel-btn" onclick={async () => { workout.cancel(); await sync.onWorkoutEnd(); await goto(`/fitness/${sl.workout}`); }}>
				{t('cancel_workout', lang)}
			</button>
		</div>

		<div class="workout-bottombar">
			<div class="topbar-left">
				<button class="pause-btn" onclick={() => workout.paused ? workout.resumeTimer() : workout.pauseTimer()} aria-label={workout.paused ? 'Resume' : 'Pause'}>
					{#if workout.paused}<Play size={16} />{:else}<Pause size={16} />{/if}
				</button>
				<span class="elapsed" class:paused={workout.paused}>{formatElapsed(workout.elapsedSeconds)}</span>
				<SyncIndicator status={sync.status} />
			</div>
			<button class="finish-btn" onclick={finishWorkout}>{t('finish', lang)}</button>
		</div>
	</div>
{/if}

{#if showPicker}
	<ExercisePicker
		onSelect={addExerciseFromPicker}
		onClose={() => showPicker = false}
	/>
{/if}

<style>
	:global(:root) { --primary-contrast: white; }
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme="light"])) { --primary-contrast: var(--nord0); }
	}
	:global(:root[data-theme="dark"]) { --primary-contrast: var(--nord0); }
	/* Completion screen */
	.completion {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.completion-header {
		text-align: center;
		padding: 1rem 0 0;
	}
	.completion-header h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.completion-name {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}
	.offline-banner {
		margin: 0.5rem 0 0;
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
		color: var(--nord0);
		background: var(--nord13);
		border-radius: 0.4rem;
	}
	.pr-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--nord13);
		margin-top: 0.4rem;
	}
	.pr-badge-count {
		font-size: 1.5rem;
		font-weight: 800;
	}
	.completion-stats {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}
	.comp-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		color: var(--color-text-secondary);
	}
	.comp-stat-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.comp-stat-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.comp-stat.kcal {
		color: var(--nord12);
	}

	.prs-section {
		background: color-mix(in srgb, var(--nord13) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--nord13) 30%, transparent);
		border-radius: 12px;
		padding: 1rem;
	}
	.prs-section h2 {
		margin: 0 0 0.6rem;
		font-size: 1rem;
		color: var(--nord13);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.pr-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.pr-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}
	.pr-exercise {
		font-weight: 600;
	}
	.pr-detail {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.pr-detail strong {
		color: var(--nord13);
	}

	.exercise-summaries h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	.ex-summary {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem 1rem;
		margin-bottom: 0.5rem;
	}
	.ex-summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.ex-summary-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.ex-summary-sets {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.ex-summary-stats {
		display: flex;
		gap: 1rem;
		margin-top: 0.3rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.template-update-section {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	.template-update-section h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.95rem;
		margin: 0 0 0.3rem;
	}
	.template-update-desc {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.75rem;
	}
	.template-diff-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}
	.diff-name {
		font-weight: 600;
		font-size: 0.85rem;
	}
	.diff-sets {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-top: 0.25rem;
	}
	.diff-set-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
	}
	.diff-old {
		color: var(--color-text-secondary);
		text-decoration: line-through;
	}
	.diff-arrow {
		color: var(--color-text-secondary);
	}
	.diff-new {
		color: var(--color-primary);
		font-weight: 600;
	}
	.update-template-btn {
		width: 100%;
		padding: 0.6rem;
		background: transparent;
		border: 1.5px solid var(--color-primary);
		border-radius: 10px;
		color: var(--color-primary);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.update-template-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.template-updated {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--nord14);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.4rem;
	}
	.done-btn {
		width: 100%;
		padding: 0.85rem;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}

	/* Active workout */
	.active-workout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.workout-bottombar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: sticky;
		bottom: 0;
		background: var(--color-bg-primary);
		z-index: 10;
		padding: 0.75rem 0;
		border-top: 1px solid var(--color-border);
	}
	.topbar-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pause-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
	}
	.pause-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.elapsed {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--color-text-secondary);
	}
	.elapsed.paused {
		color: var(--nord13);
	}
	.finish-btn {
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1.25rem;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.workout-name-input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: inherit;
		font-size: 1.2rem;
		font-weight: 700;
		padding: 0.5rem 0;
		width: 100%;
		outline: none;
	}
	.workout-name-input:focus {
		border-bottom-color: var(--color-primary);
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
	.exercise-header-actions {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.move-exercise {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		opacity: 0.6;
	}
	.move-exercise:hover:not(:disabled) {
		opacity: 1;
		color: var(--color-primary);
	}
	.move-exercise:disabled {
		opacity: 0.2;
		cursor: not-allowed;
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

	.workout-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 0;
	}
	.add-exercise-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.75rem;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.cancel-btn {
		width: 100%;
		padding: 0.75rem;
		background: transparent;
		border: 1px solid var(--nord11);
		border-radius: 10px;
		color: var(--nord11);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.cancel-btn:hover {
		background: rgba(191, 97, 106, 0.1);
	}

	/* GPS section */
	.gps-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem;
	}
	.gps-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--color-text-primary);
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-size: 0.9rem;
	}
	.gps-toggle-track {
		width: 44px;
		height: 24px;
		background: var(--nord3);
		border-radius: 24px;
		position: relative;
		transition: background 0.3s ease;
		flex-shrink: 0;
	}
	.gps-toggle-track::before {
		content: '';
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		top: 2px;
		left: 2px;
		background: white;
		transition: transform 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	.gps-toggle-track.checked {
		background: var(--nord14);
	}
	.gps-toggle-track.checked::before {
		transform: translateX(20px);
	}
	.gps-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.gps-bar.active {
		color: var(--nord14);
	}
	.gps-distance {
		font-weight: 700;
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
	}
	.gps-pace {
		font-variant-numeric: tabular-nums;
	}
	.gps-label {
		margin-left: auto;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}
	.live-map {
		height: 200px;
		border-radius: 8px;
		overflow: hidden;
	}
	.gps-initializing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		padding: 0.25rem 0;
	}
	.gps-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--color-border);
		border-top-color: var(--nord8);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
