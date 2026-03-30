<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Trash2, Play, Pause, Trophy, Clock, Dumbbell, Route, RefreshCw, Check, ChevronUp, ChevronDown, Flame, MapPin, Volume2, X, Timer, Plus, GripVertical } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const sl = $derived(fitnessSlugs(lang));
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import { getGpsTracker, trackDistance } from '$lib/js/gps.svelte';
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import { getPaceRanges, formatPaceRangeLabel, formatPaceValue } from '$lib/data/cardioPrRanges';
	import { estimateWorkoutKcal } from '$lib/data/kcalEstimate';
	import { estimateCardioKcal } from '$lib/data/cardioKcalEstimate';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import { queueSession } from '$lib/offline/fitnessQueue';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
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

	// Voice guidance config (defaults, overridden from localStorage in onMount)
	let vgEnabled = $state(false);
	let vgTriggerType = $state('distance');
	let vgTriggerValue = $state(1);
	let vgMetrics = $state(['totalTime', 'totalDistance', 'avgPace']);
	let vgVolume = $state(0.8);
	let vgAudioDuck = $state(false);
	const vgLanguage = $derived(lang);
	let vgShowPanel = $state(false);
	let vgLoaded = $state(false);

	// Persist voice guidance settings to localStorage
	$effect(() => {
		const settings = {
			enabled: vgEnabled,
			triggerType: vgTriggerType,
			triggerValue: vgTriggerValue,
			metrics: vgMetrics,
			volume: vgVolume,
			audioDuck: vgAudioDuck,
		};
		if (!vgLoaded) return;
		localStorage.setItem('vg_settings', JSON.stringify(settings));
	});

	// GPS workout mode state — if we're restoring a GPS workout that was already tracking, it's started
	let gpsStarted = $state(gps.isTracking && workout.mode === 'gps' && !workout.paused);
	let gpsStarting = $state(false);

	// Activity type for GPS workouts
	/** @type {import('$lib/js/workout.svelte').GpsActivityType} */
	let selectedActivity = $state(workout.activityType ?? 'running');
	let showActivityPicker = $state(false);
	let showAudioPanel = $state(false);
	let showIntervalPanel = $state(false);

	// Interval templates
	/** @type {any[]} */
	let intervalTemplates = $state([]);
	let selectedIntervalId = $state(/** @type {string | null} */ (null));
	let showIntervalEditor = $state(false);
	let editingIntervalId = $state(/** @type {string | null} */ (null));
	let intervalEditorName = $state('');
	/** @type {Array<{label: string, durationType: 'distance' | 'time', durationValue: number, customLabel: boolean}>} */
	let intervalEditorSteps = $state([]);
	let intervalSaving = $state(false);

	const PRESET_LABELS = ['Easy', 'Moderate', 'Hard', 'Sprint', 'Recovery', 'Hill Sprints', 'Tempo', 'Warm Up', 'Cool Down'];

	const selectedInterval = $derived(intervalTemplates.find((/** @type {any} */ t) => t._id === selectedIntervalId) ?? null);

	async function fetchIntervalTemplates() {
		try {
			const res = await fetch('/api/fitness/intervals');
			if (res.ok) {
				const d = await res.json();
				intervalTemplates = d.templates ?? [];
			}
		} catch {}
	}

	function openNewInterval() {
		editingIntervalId = null;
		intervalEditorName = '';
		intervalEditorSteps = [{ label: 'Sprint', durationType: 'distance', durationValue: 400, customLabel: false }];
		showIntervalEditor = true;
	}

	function openEditInterval(/** @type {any} */ tmpl) {
		editingIntervalId = tmpl._id;
		intervalEditorName = tmpl.name;
		intervalEditorSteps = tmpl.steps.map((/** @type {any} */ s) => ({
			label: s.label,
			durationType: s.durationType,
			durationValue: s.durationValue,
			customLabel: !PRESET_LABELS.includes(s.label)
		}));
		showIntervalEditor = true;
	}

	function addIntervalStep() {
		intervalEditorSteps = [...intervalEditorSteps, { label: 'Recovery', durationType: 'time', durationValue: 60, customLabel: false }];
	}

	function removeIntervalStep(/** @type {number} */ idx) {
		intervalEditorSteps = intervalEditorSteps.filter((_, i) => i !== idx);
	}

	function moveIntervalStep(/** @type {number} */ idx, /** @type {number} */ dir) {
		const target = idx + dir;
		if (target < 0 || target >= intervalEditorSteps.length) return;
		const arr = [...intervalEditorSteps];
		[arr[idx], arr[target]] = [arr[target], arr[idx]];
		intervalEditorSteps = arr;
	}

	async function saveInterval() {
		if (intervalSaving || !intervalEditorName.trim() || intervalEditorSteps.length === 0) return;
		intervalSaving = true;
		try {
			const body = {
				name: intervalEditorName.trim(),
				steps: intervalEditorSteps.map(s => ({
					label: s.label,
					durationType: s.durationType,
					durationValue: s.durationValue
				}))
			};
			const url = editingIntervalId ? `/api/fitness/intervals/${editingIntervalId}` : '/api/fitness/intervals';
			const method = editingIntervalId ? 'PUT' : 'POST';
			const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			if (res.ok) {
				showIntervalEditor = false;
				await fetchIntervalTemplates();
			}
		} finally {
			intervalSaving = false;
		}
	}

	async function deleteInterval(/** @type {string} */ id) {
		if (!confirm(t('delete_interval_confirm', lang))) return;
		await fetch(`/api/fitness/intervals/${id}`, { method: 'DELETE' });
		if (selectedIntervalId === id) selectedIntervalId = null;
		await fetchIntervalTemplates();
	}

	const GPS_ACTIVITIES = [
		{ id: 'running', label: 'Running', icon: '🏃' },
		{ id: 'walking', label: 'Walking', icon: '🚶' },
		{ id: 'cycling', label: 'Cycling', icon: '🚴' },
		{ id: 'hiking', label: 'Hiking', icon: '🥾' },
	];

	function selectActivity(/** @type {string} */ id) {
		selectedActivity = /** @type {import('$lib/js/workout.svelte').GpsActivityType} */ (id);
		const labels = { running: 'Running', walking: 'Walking', cycling: 'Cycling', hiking: 'Hiking' };
		workout.name = labels[selectedActivity] ?? 'GPS Workout';
		showActivityPicker = false;
	}

	const availableMetrics = [
		{ id: 'totalTime', label: 'Total Time' },
		{ id: 'totalDistance', label: 'Total Distance' },
		{ id: 'avgPace', label: 'Average Pace' },
		{ id: 'splitPace', label: 'Split Pace' },
		{ id: 'currentPace', label: 'Current Pace' },
	];

	function getVoiceGuidanceConfig() {
		const hasIntervals = selectedInterval?.steps?.length > 0;
		if (!vgEnabled && !hasIntervals) return undefined;
		return {
			enabled: true,
			triggerType: vgTriggerType,
			triggerValue: vgTriggerValue,
			metrics: vgEnabled ? vgMetrics : [],
			language: vgLanguage,
			ttsVolume: vgVolume,
			audioDuck: vgAudioDuck,
			...(hasIntervals ? { intervals: selectedInterval.steps } : {})
		};
	}

	function toggleMetric(id) {
		if (vgMetrics.includes(id)) {
			vgMetrics = vgMetrics.filter(m => m !== id);
		} else {
			vgMetrics = [...vgMetrics, id];
		}
	}

	/** @type {any} */
	let liveMap = $state(null);
	/** @type {any} */
	let livePolyline = $state(null);
	/** @type {any} */
	let liveMarker = $state(null);
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
				}
				liveMap = null;
				livePolyline = null;
				liveMarker = null;
				leafletLib = null;
				prevTrackLen = 0;
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
			radius: 6, fillColor: '#a3be8c', fillOpacity: 1, color: '#fff', weight: 2, opacity: 0, fillOpacity: 0
		}).addTo(liveMap);

		if (gps.track.length > 0) {
			// Restore existing trail on the polyline
			if (gpsStarted) {
				const pts = gps.track.map((/** @type {any} */ p) => [p.lat, p.lng]);
				livePolyline.setLatLngs(pts);
			}
			// Center on latest point — the marker $effect will also kick in
			const last = gps.track[gps.track.length - 1];
			liveMap.setView([last.lat, last.lng], 16);
			liveMarker.setLatLng([last.lat, last.lng]);
			prevTrackLen = gps.track.length;
		} else {
			// No track yet — get current position to center the map
			liveMap.setView([51.5, 10], 5);
			if ('geolocation' in navigator) {
				navigator.geolocation.getCurrentPosition(
					(pos) => {
						if (liveMap) {
							liveMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
						}
					},
					() => {},
					{ enableHighAccuracy: true, timeout: 10000 }
				);
			}
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
					useGps = await gps.start(getVoiceGuidanceConfig());
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

	// Sync workout pause state to native GPS/TTS service
	$effect(() => {
		if (!gps.isTracking) return;
		if (workout.paused) {
			gps.pauseTracking();
		} else {
			gps.resumeTracking();
		}
	});

	// Update polyline incrementally when new track points arrive
	$effect(() => {
		const len = gps.track.length;
		if (len > prevTrackLen && liveMap && livePolyline && gpsStarted) {
			for (let i = prevTrackLen; i < len; i++) {
				const p = gps.track[i];
				livePolyline.addLatLng([p.lat, p.lng]);
			}
		}
		// Always sync prevTrackLen even if we didn't draw (e.g. pre-start)
		if (len > prevTrackLen) {
			prevTrackLen = len;
		}
	});

	// Always keep marker and map view centered on the latest GPS position
	$effect(() => {
		const pt = gps.latestPoint;
		if (pt && liveMap && liveMarker) {
			const ll = [pt.lat, pt.lng];
			liveMarker.setLatLng(ll);
			liveMarker.setStyle({ opacity: 1, fillOpacity: 1 });
			const zoom = liveMap.getZoom();
			liveMap.setView(ll, zoom < 14 ? 16 : zoom);
		}
	});

	/** Check if any exercise in the workout is cardio */
	function hasCardioExercise() {
		return workout.exercises.some((/** @type {any} */ e) => {
			const exercise = getExerciseById(e.exerciseId);
			return exercise?.bodyPart === 'cardio';
		});
	}

	let _prestartGps = false;

	onMount(() => {
		if (!workout.active && !completionData) {
			goto(`/fitness/${sl.workout}`);
			return;
		}

		// Restore voice guidance settings from localStorage
		try {
			const saved = localStorage.getItem('vg_settings');
			if (saved) {
				const s = JSON.parse(saved);
				if (typeof s.enabled === 'boolean') vgEnabled = s.enabled;
				if (s.triggerType === 'distance' || s.triggerType === 'time') vgTriggerType = s.triggerType;
				if (typeof s.triggerValue === 'number' && s.triggerValue > 0) vgTriggerValue = s.triggerValue;
				if (Array.isArray(s.metrics)) vgMetrics = s.metrics;
				if (typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1) vgVolume = s.volume;
				if (typeof s.audioDuck === 'boolean') vgAudioDuck = s.audioDuck;
			}
		} catch {}
		vgLoaded = true;

		// Restore selected interval from localStorage
		try {
			const savedId = localStorage.getItem('selected_interval_id');
			if (savedId) selectedIntervalId = savedId;
		} catch {}

		// Fetch interval templates
		fetchIntervalTemplates();

		// For GPS workouts in pre-start: start GPS immediately so the map
		// shows the user's position while they configure activity/audio.
		if (workout.mode === 'gps' && !gpsStarted && !gps.isTracking) {
			_prestartGps = true;
			gps.start(undefined, true);
		}
	});

	// Persist selected interval ID
	$effect(() => {
		if (!vgLoaded) return;
		if (selectedIntervalId) {
			localStorage.setItem('selected_interval_id', selectedIntervalId);
		} else {
			localStorage.removeItem('selected_interval_id');
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
			useGps = await gps.start(getVoiceGuidanceConfig());
		}
	}

	async function startGpsWorkout() {
		if (gpsStarting) return;
		gpsStarting = true;
		try {
			if (_prestartGps && gps.isTracking) {
				// GPS was running for pre-start preview — stop and restart
				// so the native service resets time/distance to zero
				await gps.stop();
				gps.reset();
				prevTrackLen = 0;
			}
			const started = await gps.start(getVoiceGuidanceConfig());
			if (started) {
				gpsStarted = true;
				useGps = true;
				workout.resumeTimer();
			}
		} finally {
			gpsStarting = false;
			_prestartGps = false;
		}
	}

	/** Map GPS activity types to exercise IDs */
	const ACTIVITY_EXERCISE_MAP = /** @type {Record<string, string>} */ ({
		running: 'running',
		walking: 'walking',
		cycling: 'cycling-outdoor',
		hiking: 'hiking',
	});

	async function finishWorkout() {
		// Stop GPS tracking and collect track data
		const gpsTrack = gps.isTracking ? await gps.stop() : [];
		const wasGpsMode = workout.mode === 'gps';
		const actType = workout.activityType;

		const sessionData = workout.finish();

		if (wasGpsMode && gpsTrack.length >= 2) {
			// GPS workout: create a cardio exercise entry with the track attached,
			// just like a manually-added workout with GPX upload
			const filteredDistance = Math.round(trackDistance(gpsTrack) * 100) / 100;
			const durationMin = (gpsTrack[gpsTrack.length - 1].timestamp - gpsTrack[0].timestamp) / 60000;
			const exerciseId = ACTIVITY_EXERCISE_MAP[actType ?? 'running'] ?? 'running';
			const exerciseName = getExerciseById(exerciseId)?.name ?? exerciseId;

			sessionData.exercises = [{
				exerciseId,
				name: exerciseName,
				sets: [{
					distance: filteredDistance,
					duration: Math.round(durationMin * 100) / 100,
					completed: true,
				}],
				gpsTrack,
				totalDistance: filteredDistance,
			}];
		} else if (wasGpsMode && gpsTrack.length === 0) {
			// GPS workout with no track data — nothing to save
			gps.reset();
			await sync.onWorkoutEnd();
			await goto(`/fitness/${sl.workout}`);
			return;
		} else {
			// Manual workout: attach GPS to cardio exercises
			const workoutStart = new Date(sessionData.startTime).getTime();
			const filteredTrack = gpsTrack.filter((/** @type {any} */ p) => p.timestamp >= workoutStart);
			const filteredDistance = Math.round(trackDistance(filteredTrack) * 100) / 100;

			if (filteredTrack.length > 0) {
				for (const ex of sessionData.exercises) {
					const exercise = getExerciseById(ex.exerciseId);
					if (exercise?.bodyPart === 'cardio') {
						ex.gpsTrack = filteredTrack;
						ex.totalDistance = filteredDistance;
					}
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
		let totalDistance = local.totalDistance ?? 0;
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
				if (!isCardio) {
					let prevBestWeight = 0;
					let prevBestEst1rm = 0;
					let prevBestVolume = 0;

					for (const ps of prev) {
						const pw = ps.weight ?? 0;
						const pr = ps.reps ?? 0;
						if (pw > prevBestWeight) prevBestWeight = pw;
						const pe = pr > 0 && pw > 0 ? (pr === 1 ? pw : Math.round(pw * (1 + pr / 30))) : 0;
						if (pe > prevBestEst1rm) prevBestEst1rm = pe;
						const pv = pw * pr * (isBilateral ? 2 : 1);
						if (pv > prevBestVolume) prevBestVolume = pv;
					}

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
					const ranges = getPaceRanges(ex.exerciseId);

					let curBestDist = 0;
					/** @type {Map<string, number>} */
					const curBestPaces = new Map();
					for (const s of ex.sets) {
						if (!s.completed || !s.distance || s.distance <= 0) continue;
						if (s.distance > curBestDist) curBestDist = s.distance;
						if (s.duration && s.duration > 0) {
							const p = s.duration / s.distance;
							const range = ranges.find(r => s.distance >= r.min && s.distance < r.max);
							if (range) {
								const key = `${range.min}:${range.max}`;
								const cur = curBestPaces.get(key);
								if (!cur || p < cur) curBestPaces.set(key, p);
							}
						}
					}

					let prevBestDist = 0;
					/** @type {Map<string, number>} */
					const prevBestPaces = new Map();
					for (const ps of prev) {
						if (!ps.distance || ps.distance <= 0) continue;
						if (ps.distance > prevBestDist) prevBestDist = ps.distance;
						if (ps.duration && ps.duration > 0) {
							const p = ps.duration / ps.distance;
							const range = ranges.find(r => ps.distance >= r.min && ps.distance < r.max);
							if (range) {
								const key = `${range.min}:${range.max}`;
								const cur = prevBestPaces.get(key);
								if (!cur || p < cur) prevBestPaces.set(key, p);
							}
						}
					}

					if (curBestDist > prevBestDist && prevBestDist > 0) {
						prs.push({ exerciseId: ex.exerciseId, type: 'Longest Distance', value: `${curBestDist.toFixed(1)} km` });
					}
					for (const [key, pace] of curBestPaces) {
						const prevPace = prevBestPaces.get(key);
						if (prevPace && pace < prevPace) {
							prs.push({ exerciseId: ex.exerciseId, type: `Fastest Pace (${formatPaceRangeLabel(`fastestPace:${key}`)})`, value: formatPaceValue(pace) });
						}
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

{:else if workout.active && workout.mode === 'gps'}
	<div class="gps-workout">
		<div class="gps-workout-map" use:mountMap></div>

		<!-- Overlay: sits on top of the map at the bottom -->
		<div class="gps-overlay" class:gps-overlay-prestart={!gpsStarted}>
			{#if gpsStarted}
				<div class="gps-workout-stats">
					<div class="gps-stat">
						<span class="gps-stat-value">{gps.distance.toFixed(2)}</span>
						<span class="gps-stat-unit">km</span>
					</div>
					<div class="gps-stat">
						<span class="gps-stat-value">{formatElapsed(workout.elapsedSeconds)}</span>
						<span class="gps-stat-unit">time</span>
					</div>
					{#if gps.currentPace > 0}
						<div class="gps-stat">
							<span class="gps-stat-value">{Math.floor(gps.currentPace)}:{Math.round((gps.currentPace % 1) * 60).toString().padStart(2, '0')}</span>
							<span class="gps-stat-unit">/km</span>
						</div>
					{/if}
				</div>

				{#if vgEnabled}
					<div class="vg-active-badge">
						<Volume2 size={12} />
						<span>Voice: every {vgTriggerValue} {vgTriggerType === 'distance' ? 'km' : 'min'}</span>
					</div>
				{/if}

				{#if gps.intervalState}
					<div class="interval-active-overlay">
						{#if gps.intervalState.complete}
							<div class="interval-complete-badge">
								<Check size={14} />
								<span>{t('intervals_complete', lang)}</span>
							</div>
						{:else}
							<div class="interval-current-label">{gps.intervalState.currentLabel}</div>
							<div class="interval-progress-row">
								<span class="interval-step-count">{gps.intervalState.currentIndex + 1} / {gps.intervalState.totalSteps}</span>
								<div class="interval-progress-bar">
									<div class="interval-progress-fill" style="width: {Math.round(gps.intervalState.progress * 100)}%"></div>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<div class="gps-overlay-actions">
					<button class="gps-overlay-pause" onclick={() => workout.paused ? workout.resumeTimer() : workout.pauseTimer()} aria-label={workout.paused ? 'Resume' : 'Pause'}>
						{#if workout.paused}<Play size={22} />{:else}<Pause size={22} />{/if}
					</button>
					{#if workout.paused}
						<button class="gps-overlay-cancel" onclick={async () => { if (gps.isTracking) await gps.stop(); gps.reset(); workout.cancel(); await sync.onWorkoutEnd(); await goto(`/fitness/${sl.workout}`); }}>
							<Trash2 size={18} />
						</button>
					{/if}
					<button class="gps-overlay-finish" onclick={finishWorkout}>Finish</button>
				</div>
			{:else}
				<div class="gps-options-grid">
					<button class="gps-option-tile" onclick={() => { showActivityPicker = !showActivityPicker; showAudioPanel = false; showIntervalPanel = false; }} type="button">
						<span class="gps-option-icon">{GPS_ACTIVITIES.find(a => a.id === selectedActivity)?.icon ?? '🏃'}</span>
						<span class="gps-option-label">Activity</span>
						<span class="gps-option-value">{GPS_ACTIVITIES.find(a => a.id === selectedActivity)?.label ?? 'Running'}</span>
					</button>
					<button class="gps-option-tile" onclick={() => { showAudioPanel = !showAudioPanel; showActivityPicker = false; showIntervalPanel = false; }} type="button">
						<Volume2 size={20} />
						<span class="gps-option-label">Audio Stats</span>
						<span class="gps-option-value">{vgEnabled ? `Every ${vgTriggerValue} ${vgTriggerType === 'distance' ? 'km' : 'min'}` : 'Off'}</span>
					</button>
					<button class="gps-option-tile" onclick={() => { showIntervalPanel = !showIntervalPanel; showActivityPicker = false; showAudioPanel = false; }} type="button">
						<Timer size={20} />
						<span class="gps-option-label">{t('intervals', lang)}</span>
						<span class="gps-option-value">{selectedInterval?.name ?? t('no_intervals', lang)}</span>
					</button>
				</div>

				{#if showActivityPicker}
					<div class="gps-activity-picker">
						{#each GPS_ACTIVITIES as act (act.id)}
							<button
								class="gps-activity-choice"
								class:active={selectedActivity === act.id}
								onclick={() => selectActivity(act.id)}
								type="button"
							>
								<span class="gps-activity-icon">{act.icon}</span>
								<span>{act.label}</span>
							</button>
						{/each}
					</div>
				{/if}

				{#if showAudioPanel}
					<div class="vg-panel">
						{#if !gps.hasTtsEngine()}
							<div class="vg-no-engine">
								<span>No text-to-speech engine installed.</span>
								<button class="vg-install-btn" onclick={() => gps.installTtsEngine()} type="button">
									Install TTS Engine
								</button>
							</div>
						{:else}
						<Toggle bind:checked={vgEnabled} label="Enable voice announcements" />

						{#if vgEnabled}
							<div class="vg-group">
								<span class="vg-label">Announce every</span>
								<div class="vg-trigger-row">
									<input
										class="vg-number"
										type="number"
										min="0.1"
										step="0.5"
										bind:value={vgTriggerValue}
									/>
									<select class="vg-select" bind:value={vgTriggerType}>
										<option value="distance">km</option>
										<option value="time">min</option>
									</select>
								</div>
							</div>

							<div class="vg-group">
								<span class="vg-label">Metrics</span>
								<div class="vg-metrics">
									{#each availableMetrics as m (m.id)}
										<button
											class="vg-metric-chip"
											class:selected={vgMetrics.includes(m.id)}
											onclick={() => toggleMetric(m.id)}
											type="button"
										>
											{m.label}
										</button>
									{/each}
								</div>
							</div>

							<div class="vg-group">
								<label class="vg-label">
									TTS Volume
									<span class="vg-volume-value">{Math.round(vgVolume * 100)}%</span>
								</label>
								<input
									class="vg-range"
									type="range"
									min="0"
									max="1"
									step="0.05"
									bind:value={vgVolume}
								/>
							</div>

							<Toggle bind:checked={vgAudioDuck} label="Duck other audio during TTS" />

						{/if}
						{/if}
					</div>
				{/if}

				{#if showIntervalPanel}
					<div class="interval-panel">
						{#if intervalTemplates.length > 0}
							<div class="interval-list">
								{#each intervalTemplates as tmpl (tmpl._id)}
									<div class="interval-card" class:selected={selectedIntervalId === tmpl._id}>
										<button class="interval-card-main" type="button" onclick={() => { selectedIntervalId = selectedIntervalId === tmpl._id ? null : tmpl._id; }}>
											<span class="interval-card-name">{tmpl.name}</span>
											<span class="interval-card-info">{tmpl.steps.length} {t('steps_count', lang)}</span>
										</button>
										<div class="interval-card-actions">
											<button class="interval-card-edit" type="button" onclick={() => openEditInterval(tmpl)}>{t('edit', lang)}</button>
											<button class="interval-card-delete" type="button" onclick={() => deleteInterval(tmpl._id)}><Trash2 size={14} /></button>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="interval-empty">{t('no_intervals', lang)}</p>
						{/if}
						<button class="interval-new-btn" type="button" onclick={openNewInterval}>
							<Plus size={16} />
							{t('new_interval', lang)}
						</button>
					</div>
				{/if}

				<button class="gps-start-btn" onclick={startGpsWorkout} disabled={gpsStarting}>
					{#if gpsStarting}
						<span class="gps-spinner"></span> Initializing GPS…
					{:else}
						Start
					{/if}
				</button>

				<button class="gps-cancel-link" onclick={async () => { if (gps.isTracking) await gps.stop(); gps.reset(); workout.cancel(); await sync.onWorkoutEnd(); await goto(`/fitness/${sl.workout}`); }} type="button">
					<X size={14} />
					{t('cancel_workout', lang)}
				</button>
			{/if}
		</div>

		{#if showIntervalEditor}
			<div class="interval-editor-overlay">
				<div class="interval-editor">
					<div class="interval-editor-header">
						<h2>{editingIntervalId ? t('edit_interval', lang) : t('new_interval', lang)}</h2>
						<button class="interval-editor-close" type="button" onclick={() => showIntervalEditor = false}>
							<X size={20} />
						</button>
					</div>

					<input
						class="interval-editor-name"
						type="text"
						placeholder={t('interval_name_placeholder', lang)}
						bind:value={intervalEditorName}
					/>

					<div class="interval-editor-steps">
						{#each intervalEditorSteps as step, idx (idx)}
							<div class="interval-step-card">
								<div class="interval-step-header">
									<span class="interval-step-num">{idx + 1}</span>
									<div class="interval-step-move">
										<button type="button" onclick={() => moveIntervalStep(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></button>
										<button type="button" onclick={() => moveIntervalStep(idx, 1)} disabled={idx === intervalEditorSteps.length - 1}><ChevronDown size={14} /></button>
									</div>
									<button class="interval-step-remove" type="button" onclick={() => removeIntervalStep(idx)} disabled={intervalEditorSteps.length <= 1}>
										<Trash2 size={14} />
									</button>
								</div>

								<div class="interval-step-labels">
									{#each PRESET_LABELS as preset}
										<button
											class="interval-label-chip"
											class:selected={!step.customLabel && step.label === preset}
											type="button"
											onclick={() => { intervalEditorSteps[idx].label = preset; intervalEditorSteps[idx].customLabel = false; }}
										>{preset}</button>
									{/each}
									<button
										class="interval-label-chip"
										class:selected={step.customLabel}
										type="button"
										onclick={() => { intervalEditorSteps[idx].customLabel = true; }}
									>{t('custom', lang)}</button>
								</div>

								{#if step.customLabel}
									<input
										class="interval-step-custom-input"
										type="text"
										placeholder={t('step_label', lang)}
										bind:value={intervalEditorSteps[idx].label}
									/>
								{/if}

								<div class="interval-step-duration">
									<input
										class="interval-step-value"
										type="number"
										min="1"
										bind:value={intervalEditorSteps[idx].durationValue}
									/>
									<div class="interval-step-type-toggle">
										<button
											class="interval-type-btn"
											class:active={step.durationType === 'distance'}
											type="button"
											onclick={() => { intervalEditorSteps[idx].durationType = 'distance'; }}
										>{t('meters', lang)}</button>
										<button
											class="interval-type-btn"
											class:active={step.durationType === 'time'}
											type="button"
											onclick={() => { intervalEditorSteps[idx].durationType = 'time'; }}
										>{t('seconds', lang)}</button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<button class="interval-add-step-btn" type="button" onclick={addIntervalStep}>
						<Plus size={16} />
						{t('add_step', lang)}
					</button>

					<button
						class="interval-save-btn"
						type="button"
						onclick={saveInterval}
						disabled={intervalSaving || !intervalEditorName.trim() || intervalEditorSteps.length === 0}
					>
						{intervalSaving ? t('saving', lang) : t('save_interval', lang)}
					</button>
				</div>
			</div>
		{/if}
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

				{#if !useGps}
					<button class="vg-toggle-row" onclick={() => vgShowPanel = !vgShowPanel} type="button">
						<Volume2 size={14} />
						<span class="gps-toggle-track" class:checked={vgEnabled}></span>
						<span>Voice Guidance</span>
					</button>

					{#if vgShowPanel}
						<div class="vg-panel">
							{#if !gps.hasTtsEngine()}
								<div class="vg-no-engine">
									<span>No text-to-speech engine installed.</span>
									<button class="vg-install-btn" onclick={() => gps.installTtsEngine()} type="button">
										Install TTS Engine
									</button>
								</div>
							{:else}
							<Toggle bind:checked={vgEnabled} label="Enable voice announcements" />

							{#if vgEnabled}
								<div class="vg-group">
									<span class="vg-label">Announce every</span>
									<div class="vg-trigger-row">
										<input
											class="vg-number"
											type="number"
											min="0.1"
											step="0.5"
											bind:value={vgTriggerValue}
										/>
										<select class="vg-select" bind:value={vgTriggerType}>
											<option value="distance">km</option>
											<option value="time">min</option>
										</select>
									</div>
								</div>

								<div class="vg-group">
									<span class="vg-label">Metrics</span>
									<div class="vg-metrics">
										{#each availableMetrics as m (m.id)}
											<button
												class="vg-metric-chip"
												class:selected={vgMetrics.includes(m.id)}
												onclick={() => toggleMetric(m.id)}
												type="button"
											>
												{m.label}
											</button>
										{/each}
									</div>
								</div>

								<div class="vg-group">
									<label class="vg-label">
										TTS Volume
										<span class="vg-volume-value">{Math.round(vgVolume * 100)}%</span>
									</label>
									<input
										class="vg-range"
										type="range"
										min="0"
										max="1"
										step="0.05"
										bind:value={vgVolume}
									/>
								</div>

								<Toggle bind:checked={vgAudioDuck} label="Duck other audio during TTS" />

							{/if}
							{/if}
						</div>
					{/if}
				{/if}

				{#if useGps}
					<div class="gps-bar active">
						<span class="gps-distance">{gps.distance.toFixed(2)} km</span>
						{#if gps.currentPace > 0}
							<span class="gps-pace">{Math.floor(gps.currentPace)}:{Math.round((gps.currentPace % 1) * 60).toString().padStart(2, '0')} /km</span>
						{/if}
						<span class="gps-label">{gps.track.length} pts</span>
					</div>
					{#if vgEnabled}
						<div class="vg-active-badge">
							<Volume2 size={12} />
							<span>Voice: every {vgTriggerValue} {vgTriggerType === 'distance' ? 'km' : 'min'}</span>
						</div>
					{/if}
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
			<button class="cancel-btn" onclick={async () => { if (gps.isTracking) await gps.stop(); gps.reset(); workout.cancel(); await sync.onWorkoutEnd(); await goto(`/fitness/${sl.workout}`); }}>
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

	/* Voice Guidance */
	.vg-toggle-row {
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
	.vg-panel {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.5rem 0 0;
		border-top: 1px solid var(--color-border);
	}
	.vg-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.vg-row input[type="checkbox"] {
		accent-color: var(--nord14);
	}
	.vg-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.vg-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.vg-volume-value {
		font-variant-numeric: tabular-nums;
	}
	.vg-range {
		width: 100%;
		accent-color: var(--nord10);
	}
	.vg-trigger-row {
		display: flex;
		gap: 0.4rem;
	}
	.vg-number {
		width: 70px;
		padding: 0.3rem 0.4rem;
		border-radius: 6px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.vg-select {
		padding: 0.3rem 0.4rem;
		border-radius: 6px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.vg-metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.vg-metric-chip {
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.vg-metric-chip.selected {
		background: var(--nord14);
		color: var(--nord0);
		border-color: var(--nord14);
	}
	.vg-no-engine {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.vg-install-btn {
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		border: 1px solid var(--nord14);
		background: transparent;
		color: var(--nord14);
		font-size: 0.85rem;
		cursor: pointer;
		align-self: flex-start;
	}
	.vg-active-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		color: var(--nord14);
		opacity: 0.8;
	}
	.gps-overlay .vg-active-badge {
		color: var(--nord7);
	}
	.gps-overlay .vg-panel {
		background: rgba(46, 52, 64, 0.82);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 10px;
		padding: 0.6rem;
		border-top: none;
		color: #fff;
	}
	.gps-overlay .vg-label {
		color: rgba(255,255,255,0.6);
	}
	.gps-overlay .vg-row {
		color: #fff;
	}
	.gps-overlay .vg-number,
	.gps-overlay .vg-select {
		background: rgba(255,255,255,0.1);
		border-color: rgba(255,255,255,0.2);
		color: #fff;
	}
	.gps-overlay .vg-metric-chip {
		background: rgba(255,255,255,0.1);
		border-color: rgba(255,255,255,0.2);
		color: rgba(255,255,255,0.7);
	}
	.gps-overlay .vg-metric-chip.selected {
		background: var(--nord14);
		color: var(--nord0);
		border-color: var(--nord14);
	}

	/* GPS Workout Mode — full-bleed map with overlay */
	.gps-workout {
		position: fixed;
		inset: 0;
		z-index: 50;
	}
	.gps-workout-map {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	/* Dark gradient at top so status bar text stays readable */
	.gps-workout::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: calc(env(safe-area-inset-top, 0px) + 3rem + 24px);
		background: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent);
		z-index: 1;
		pointer-events: none;
	}
	:global(.gps-workout-map .leaflet-control-container) {
		/* push leaflet's own controls above our overlay */
		position: relative;
		z-index: 5;
	}
	.gps-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
		background: var(--nav-bg, rgba(46, 52, 64, 0.82));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid var(--nav-border, rgba(255,255,255,0.08));
		box-shadow: 0 -4px 24px var(--nav-shadow, rgba(0,0,0,0.25));
		color: var(--nav-text-active, #fff);
		pointer-events: none;
	}
	@media (prefers-color-scheme: dark) {
		.gps-overlay {
			--nav-bg: rgba(20, 20, 20, 0.78);
			--nav-border: rgba(255,255,255,0.06);
		}
	}
	:global(:root[data-theme="dark"]) .gps-overlay {
		--nav-bg: rgba(20, 20, 20, 0.78);
		--nav-border: rgba(255,255,255,0.06);
	}
	:global(:root[data-theme="light"]) .gps-overlay {
		--nav-bg: rgba(255, 255, 255, 0.82);
		--nav-border: rgba(0,0,0,0.08);
		--nav-shadow: rgba(0,0,0,0.1);
		--nav-text-active: var(--nord0);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .gps-overlay {
			--nav-bg: rgba(255, 255, 255, 0.82);
			--nav-border: rgba(0,0,0,0.08);
			--nav-shadow: rgba(0,0,0,0.1);
			--nav-text-active: var(--nord0);
		}
	}
	.gps-overlay-prestart {
		background: none !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
		border-top: none !important;
		box-shadow: none !important;
	}
	.gps-overlay > * {
		pointer-events: auto;
	}
	.gps-workout-stats {
		display: flex;
		justify-content: space-around;
		padding: 0.5rem 0;
	}
	.gps-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.gps-stat-value {
		font-size: 1.8rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: inherit;
	}
	.gps-stat-unit {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.65;
	}
	.gps-options-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
	}
	.gps-option-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.65rem 0.5rem;
		background: rgba(46, 52, 64, 0.82);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 10px;
		cursor: pointer;
		font: inherit;
		color: #fff;
		transition: border-color 0.15s ease;
	}
	.gps-option-tile:hover {
		border-color: rgba(255,255,255,0.5);
	}
	.gps-option-icon {
		font-size: 1.25rem;
	}
	.gps-option-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255,255,255,0.6);
	}
	.gps-option-value {
		font-size: 0.85rem;
		font-weight: 700;
	}
	.gps-activity-picker {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
	}
	.gps-activity-choice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.75rem;
		background: rgba(46, 52, 64, 0.82);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 8px;
		cursor: pointer;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		color: #fff;
		transition: all 0.15s ease;
	}
	.gps-activity-choice.active {
		border-color: var(--nord8);
		background: rgba(46, 52, 64, 0.9);
		color: var(--nord8);
		box-shadow: inset 0 0 0 1px rgba(136,192,208,0.25);
	}
	.gps-activity-choice:hover:not(.active) {
		border-color: rgba(255,255,255,0.4);
	}
	.gps-activity-icon {
		font-size: 1.1rem;
	}
	.gps-start-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		width: 100%;
		padding: 1rem;
		background: var(--blue);
		color: white;
		border: none;
		border-radius: 50px;
		font-weight: 800;
		font-size: 1.2rem;
		cursor: pointer;
		letter-spacing: 0.04em;
	}
	.gps-start-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.gps-cancel-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		border: none;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0,0,0,0.6);
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 1rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
		margin: 0 -0.75rem calc(-0.75rem - env(safe-area-inset-bottom, 0px));
		background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
	}
	.gps-cancel-link:hover {
		color: var(--nord11);
	}
	.gps-overlay-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.gps-overlay-pause {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: rgba(128,128,128,0.12);
		border: 1px solid var(--nav-border, rgba(255,255,255,0.25));
		border-radius: 50%;
		color: inherit;
		cursor: pointer;
		flex-shrink: 0;
	}
	.gps-overlay-pause:hover {
		background: rgba(128,128,128,0.2);
	}
	.gps-overlay-cancel {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: rgba(191,97,106,0.25);
		border: 1px solid var(--nord11);
		border-radius: 50%;
		color: var(--nord11);
		cursor: pointer;
		flex-shrink: 0;
	}
	.gps-overlay-cancel:hover {
		background: rgba(191,97,106,0.4);
	}
	.gps-overlay-finish {
		flex: 1;
		padding: 0.85rem;
		background: var(--nord11);
		color: #fff;
		border: none;
		border-radius: 50px;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
	}

	/* Interval Panel (pre-start selection) */
	.interval-panel {
		background: rgba(46, 52, 64, 0.82);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 10px;
		padding: 0.6rem;
		color: #fff;
	}
	.interval-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}
	.interval-card {
		display: flex;
		align-items: center;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px;
		overflow: hidden;
		transition: border-color 0.15s;
	}
	.interval-card.selected {
		border-color: var(--nord8);
		background: rgba(136,192,208,0.12);
	}
	.interval-card-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.6rem;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: left;
	}
	.interval-card-name {
		font-weight: 600;
		font-size: 0.85rem;
	}
	.interval-card-info {
		font-size: 0.7rem;
		opacity: 0.6;
	}
	.interval-card-actions {
		display: flex;
		gap: 0.2rem;
		padding-right: 0.4rem;
	}
	.interval-card-edit, .interval-card-delete {
		background: none;
		border: none;
		color: rgba(255,255,255,0.5);
		font: inherit;
		font-size: 0.7rem;
		cursor: pointer;
		padding: 0.3rem;
	}
	.interval-card-edit:hover, .interval-card-delete:hover {
		color: #fff;
	}
	.interval-empty {
		text-align: center;
		font-size: 0.8rem;
		opacity: 0.5;
		margin: 0.5rem 0;
	}
	.interval-new-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.5rem;
		background: rgba(255,255,255,0.08);
		border: 1px dashed rgba(255,255,255,0.2);
		border-radius: 8px;
		color: var(--nord8);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.interval-new-btn:hover {
		background: rgba(255,255,255,0.12);
	}

	/* Interval Editor (full-screen overlay on map) */
	.interval-editor-overlay {
		position: absolute;
		inset: 0;
		z-index: 100;
		background: rgba(46, 52, 64, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.interval-editor {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		padding-top: calc(1rem + env(safe-area-inset-top, 0px));
		padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		color: #fff;
		max-width: 500px;
		width: 100%;
		margin: 0 auto;
	}
	.interval-editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.interval-editor-header h2 {
		margin: 0;
		font-size: 1.2rem;
	}
	.interval-editor-close {
		background: none;
		border: none;
		color: rgba(255,255,255,0.6);
		cursor: pointer;
		padding: 0.3rem;
	}
	.interval-editor-name {
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 8px;
		color: #fff;
		font: inherit;
		font-size: 0.95rem;
	}
	.interval-editor-name::placeholder {
		color: rgba(255,255,255,0.35);
	}
	.interval-editor-steps {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.interval-step-card {
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 10px;
		padding: 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.interval-step-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.interval-step-num {
		font-weight: 700;
		font-size: 0.8rem;
		background: rgba(255,255,255,0.12);
		border-radius: 50%;
		width: 1.4rem;
		height: 1.4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.interval-step-move {
		display: flex;
		gap: 0.1rem;
		margin-left: auto;
	}
	.interval-step-move button {
		background: none;
		border: none;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		padding: 0.15rem;
	}
	.interval-step-move button:hover:not(:disabled) {
		color: #fff;
	}
	.interval-step-move button:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
	.interval-step-remove {
		background: none;
		border: none;
		color: rgba(255,255,255,0.3);
		cursor: pointer;
		padding: 0.15rem;
	}
	.interval-step-remove:hover:not(:disabled) {
		color: var(--nord11);
	}
	.interval-step-remove:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
	.interval-step-labels {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.interval-label-chip {
		padding: 0.25rem 0.55rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 20px;
		color: rgba(255,255,255,0.7);
		font: inherit;
		font-size: 0.72rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.interval-label-chip.selected {
		background: var(--nord8);
		border-color: var(--nord8);
		color: var(--nord0);
		font-weight: 600;
	}
	.interval-step-custom-input {
		width: 100%;
		padding: 0.4rem 0.6rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 6px;
		color: #fff;
		font: inherit;
		font-size: 0.85rem;
	}
	.interval-step-duration {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.interval-step-value {
		width: 5rem;
		padding: 0.4rem 0.5rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 6px;
		color: #fff;
		font: inherit;
		font-size: 0.9rem;
		text-align: center;
	}
	.interval-step-type-toggle {
		display: flex;
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 6px;
		overflow: hidden;
	}
	.interval-type-btn {
		padding: 0.4rem 0.65rem;
		background: rgba(255,255,255,0.06);
		border: none;
		color: rgba(255,255,255,0.5);
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		transition: all 0.12s;
	}
	.interval-type-btn.active {
		background: var(--nord8);
		color: var(--nord0);
		font-weight: 600;
	}
	.interval-add-step-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.55rem;
		background: rgba(255,255,255,0.06);
		border: 1px dashed rgba(255,255,255,0.2);
		border-radius: 8px;
		color: var(--nord8);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.interval-save-btn {
		width: 100%;
		padding: 0.8rem;
		background: var(--nord14);
		border: none;
		border-radius: 50px;
		color: var(--nord0);
		font: inherit;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
	}
	.interval-save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Active Interval Overlay */
	.interval-active-overlay {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.4rem 0.5rem;
		background: rgba(136,192,208,0.12);
		border: 1px solid rgba(136,192,208,0.25);
		border-radius: 8px;
	}
	.interval-current-label {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--nord8);
		text-align: center;
	}
	.interval-progress-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.interval-step-count {
		font-size: 0.72rem;
		font-weight: 600;
		opacity: 0.7;
		white-space: nowrap;
	}
	.interval-progress-bar {
		flex: 1;
		height: 4px;
		background: rgba(255,255,255,0.12);
		border-radius: 2px;
		overflow: hidden;
	}
	.interval-progress-fill {
		height: 100%;
		background: var(--nord8);
		border-radius: 2px;
		transition: width 0.5s ease;
	}
	.interval-complete-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.3rem;
		color: var(--nord14);
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
