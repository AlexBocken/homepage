<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Clock from '@lucide/svelte/icons/clock';
	import Weight from '@lucide/svelte/icons/weight';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Copy from '@lucide/svelte/icons/copy';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Upload from '@lucide/svelte/icons/upload';
	import Download from '@lucide/svelte/icons/download';
	import Route from '@lucide/svelte/icons/route';
	import X from '@lucide/svelte/icons/x';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Check from '@lucide/svelte/icons/check';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Flame from '@lucide/svelte/icons/flame';
	import Info from '@lucide/svelte/icons/info';
	import Mountain from '@lucide/svelte/icons/mountain';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { toast } from '$lib/js/toast.svelte';

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const sl = $derived(fitnessSlugs(lang));
	import { getExerciseById, getExerciseMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import { formatPaceRangeLabel, formatPaceValue } from '$lib/data/cardioPrRanges';
	import { createTrackHover } from '$lib/stores/trackHover.svelte';
	import { createAxisWidthGroup } from '$lib/stores/axisWidthGroup.svelte';
	import { attachTrackMap, onGraphHover, graphHoverIndex } from '$lib/fitness/gpsTrackHover.svelte';
	import { computeBestEfforts } from '$lib/fitness/bestEfforts';
	import { formatElapsed, formatEffortRate } from '$lib/fitness/segmentFormat';
	import { activityKindOf } from '$lib/fitness/bestEffortDistances';
	import { TILE_URL, ROUTE_COLOR } from '$lib/data/mapTiles';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import DateTimePicker from '$lib/components/DateTimePicker.svelte';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import SegmentCreator from '$lib/components/fitness/SegmentCreator.svelte';
	import SegmentEffortsList from '$lib/components/fitness/SegmentEffortsList.svelte';
	import Flag from '@lucide/svelte/icons/flag';
	import { onMount } from 'svelte';
	import { buildGpsView, formatPaceTooltip } from '$lib/fitness/gpsSeries';

	let { data } = $props();

	const session = $derived(data.session);
	// Unsynced (offline-queued) run: lives only in the browser outbox, so the
	// server-only actions (edit, share, snap, GPX, segments, recalculate) don't
	// apply — only viewing and deleting do.
	const unsynced = $derived(!!data.unsynced);
	// Board for this run — best efforts read in pace (running) or speed (cycling).
	const beKind = $derived(activityKindOf(session?.activityType));

	// GPS tracks in this run that a segment can be carved from (top-level + per-exercise).
	const gpsSources = $derived.by(() => {
		const out = [];
		if ((session?.gpsTrack?.length ?? 0) >= 2) {
			out.push({ exerciseIndex: null, track: session.gpsTrack, label: session.name ?? t.workout_singular });
		}
		(session?.exercises ?? []).forEach((/** @type {any} */ ex, /** @type {number} */ idx) => {
			if ((ex.gpsTrack?.length ?? 0) >= 2) {
				out.push({ exerciseIndex: idx, track: ex.gpsTrack, label: getExerciseById(ex.exerciseId, lang)?.localName ?? ex.exerciseId });
			}
		});
		return out;
	});

	let creatingSegment = $state(false);
	let createSourceIdx = $state(0);
	async function onSegmentCreated() {
		creatingSegment = false;
		toast.success(t.create_segment);
		await invalidateAll();
	}


	/**
	 * Share the run. Like the Strava apps, the generated card image travels
	 * *with* the link via the OS share sheet (Web Share API Level 2 `files`),
	 * so it lands as a real image in chats/social — not just a link relying on
	 * the receiver to unfurl the OG tag. Falls back to a link-only share, then
	 * to copying the link (desktop, where there's no share sheet).
	 */
	async function shareRun() {
		const url = data.shareUrl;
		if (!url) return;
		const title = session?.name ?? t.workout_singular;

		// Try sharing the card image as a file. The card is prefetched on mount
		// so this fetch is cache-fast and keeps the click's transient activation.
		try {
			if (data.cardImage && navigator.canShare) {
				const res = await fetch(data.cardImage);
				if (res.ok) {
					const blob = await res.blob();
					const file = new File([blob], 'run.webp', { type: blob.type || 'image/webp' });
					// Include the link as BOTH `url` and inside `text`, so it travels
					// with the image whether the target app reads the structured `url`
					// field or only the caption text. Some platforms reject `url`
					// alongside files — fall back to text-only in that case.
					const withUrl = { files: [file], title, text: url, url };
					const fileData = navigator.canShare(withUrl) ? withUrl : { files: [file], title, text: url };
					if (navigator.canShare(fileData)) {
						await navigator.share(fileData);
						return;
					}
				}
			}
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return; // user cancelled
			// otherwise fall through to link-only share
		}

		try {
			if (navigator.share) {
				await navigator.share({ title, url });
			} else {
				await navigator.clipboard.writeText(url);
				toast.success(t.share_copied);
			}
		} catch {
			// User dismissed the share sheet — nothing to do.
		}
	}

	async function copyLog() {
		try {
			const { formatWorkoutLog } = await import('$lib/js/workoutLog');
			await navigator.clipboard.writeText(formatWorkoutLog(session, lang));
			toast.success(t.log_copied);
		} catch {
			toast.error(t.log_copy_failed);
		}
	}

	/** Use server-computed kcal estimate (stored at save/recalculate time) */
	const kcalResult = $derived(session?.kcalEstimate ?? null);

	/** @type {Record<string, { label: string, doi?: string }>} */
	const METHOD_CITATIONS = {
		'lytle':           { label: 'Lytle et al. (2019)', doi: '10.1249/MSS.0000000000001925' },
		'minetti-gps':     { label: 'Minetti et al. (2002)', doi: '10.1152/japplphysiol.01177.2001' },
		'cycling-physics': { label: 'Cycling physics model' },
		'met-speed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'met-fixed':       { label: 'Ainsworth et al. (2011)', doi: '10.1249/MSS.0b013e31821ece12' },
		'flat-rate':       { label: 'Flat-rate estimate' },
	};

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const t = document.documentElement.dataset.theme;
		if (t === 'dark') return true;
		if (t === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	let dark = $state(checkDark());
	let showKcalInfo = $state(false);
	onMount(() => {
		// Warm the share-card image so a later Share click can attach it without
		// a slow fetch (which would lose the click's transient activation).
		if (data.cardImage) fetch(data.cardImage).catch(() => {});

		// Honour a ?highlight= deep-link once the GPS maps are mounted.
		applyHighlight();

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
			startMs: new Date(session.startTime).getTime(),
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
		const startTime = new Date(editData.startMs);
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
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save session');
			}
		} catch { toast.error('Failed to save session'); }
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
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to recalculate');
			}
		} catch { toast.error('Failed to recalculate'); }
		recalculating = false;
	}

	// --- BRouter path snapping on the edit screen (recorded vs snapped) ---
	let snapState = $state('idle'); // idle | loading | preview | saving | saved | kept | error
	/** @type {any[]|null} */
	let snappedTrack = $state(null);
	let snappedDistance = $state(0);
	let snapError = $state('');

	// First exercise carrying a GPS track — the snap endpoint operates on it.
	const snapTarget = $derived.by(() => {
		const exs = session?.exercises ?? [];
		for (let i = 0; i < exs.length; i++) {
			if ((exs[i].gpsTrack?.length ?? 0) >= 2) return { index: i, track: exs[i].gpsTrack };
		}
		return null;
	});

	/** @type {any} */ let compMap = null;
	/** @type {any} */ let compRecordedLine = null;
	/** @type {any} */ let compSnappedLine = null;
	/** @type {any} */ let compLeaflet = null;

	/** @param {HTMLElement} node */
	function mountSnapMap(node) {
		initSnapMap(node);
		return () => {
			if (compMap) compMap.remove();
			compMap = null; compRecordedLine = null; compSnappedLine = null; compLeaflet = null;
		};
	}
	/** @param {HTMLElement} node */
	async function initSnapMap(node) {
		compLeaflet = await import('leaflet');
		if (!node.isConnected || !snapTarget) return;
		compMap = compLeaflet.map(node, { attributionControl: false, zoomControl: false });
		compLeaflet.tileLayer(TILE_URL.karte, { maxZoom: 19 }).addTo(compMap);
		const latlngs = snapTarget.track.map((/** @type {any} */ p) => [p.lat, p.lng]);
		compRecordedLine = compLeaflet.polyline(latlngs, { color: ROUTE_COLOR, weight: 4 }).addTo(compMap);
		if (latlngs.length) compMap.fitBounds(compRecordedLine.getBounds(), { padding: [20, 20] });
		if (snappedTrack) drawSnappedLine();
	}
	function drawSnappedLine() {
		if (!compMap || !compLeaflet || !snappedTrack) return;
		if (compSnappedLine) compSnappedLine.remove();
		const ll = snappedTrack.map((/** @type {any} */ p) => [p.lat, p.lng]);
		compSnappedLine = compLeaflet.polyline(ll, { color: '#5e81ac', weight: 4 }).addTo(compMap);
	}

	async function snapToPaths() {
		if (!snapTarget) return;
		snapState = 'loading';
		snapError = '';
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}/snap`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseIndex: snapTarget.index, profile: 'trekking', persist: false })
			});
			if (!res.ok) throw new Error('snap failed');
			const d = await res.json();
			snappedTrack = d.track;
			snappedDistance = d.distance;
			drawSnappedLine();
			snapState = 'preview';
		} catch {
			snapState = 'error';
			snapError = t.snap_failed;
		}
	}
	async function useSnappedTrack() {
		if (!snapTarget) return;
		snapState = 'saving';
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}/snap`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseIndex: snapTarget.index, profile: 'trekking', persist: true })
			});
			if (!res.ok) throw new Error('snap failed');
			await res.json();
			snapState = 'saved';
			// Reload track/stats/efforts; the snap endpoint already recomputed the
			// preview/distance/kcal/bbox + re-rendered images (new track hash).
			await invalidateAll();
			// Re-sync the edit form's sets to the snapped distances (keep the
			// user's other in-progress edits to name/date/notes).
			if (editData) {
				editData.exercises = session.exercises.map((/** @type {any} */ ex) => ({
					exerciseId: ex.exerciseId,
					name: ex.name,
					restTime: ex.restTime,
					sets: ex.sets.map((/** @type {any} */ s) => ({ ...s }))
				}));
			}
		} catch {
			snapState = 'error';
			snapError = t.snap_failed;
		}
	}

	async function deleteSession() {
		if (!await confirm(t.delete_session_confirm)) return;
		deleting = true;
		try {
			if (unsynced) {
				// Not on the server yet — drop it straight from the offline outbox.
				const { removeQueuedSession } = await import('$lib/offline/fitnessQueue');
				await removeQueuedSession(Number(String(session._id).slice('queued-'.length)));
				await goto(`/fitness/${sl.history}`);
				return;
			}
			const res = await fetch(`/api/fitness/sessions/${session._id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto(`/fitness/${sl.history}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to delete session');
			}
		} catch { toast.error('Failed to delete session'); }
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

	let uploading = $state(-1);

	// One hover cursor per GPS exercise so map pins / chart cursors stay
	// independent. Created lazily and cached by exercise index.
	/** @type {Map<number, import('$lib/stores/trackHover.svelte').TrackHoverStore>} */
	const hoverStores = new Map();
	/** @param {number} idx */
	function hoverFor(idx) {
		let s = hoverStores.get(idx);
		if (!s) { s = createTrackHover(); hoverStores.set(idx, s); }
		return s;
	}

	// Best-effort list → map highlight. Hovering a row lights its split up on the
	// track; clicking pins it (so it stays after the mouse leaves).
	/** @type {Map<number, import('$lib/fitness/bestEfforts').BestEffort[]>} */
	const effortsCache = new Map();
	/** Prefer the server-precomputed best efforts (one GPS exercise per run, so
	 *  their indices match this track); compute on the fly only if not backfilled. */
	/** @param {number} idx @param {any[]} track */
	function effortsFor(idx, track) {
		if (session.bestEfforts?.length) return session.bestEfforts;
		let e = effortsCache.get(idx);
		if (!e) { e = computeBestEfforts(track); effortsCache.set(idx, e); }
		return e;
	}
	/** @type {Record<number, number|null>} hovered split km per exercise */
	let beHover = $state({});
	/** @type {Record<number, number|null>} pinned split km per exercise */
	let beClick = $state({});
	/** @param {number} idx */
	function beActiveKm(idx) { return beHover[idx] ?? beClick[idx] ?? null; }
	/** @param {number} idx @param {number} km */
	function clickEffort(idx, km) {
		const next = beClick[idx] === km ? null : km;
		beClick[idx] = next;
		// Scroll the map up into view so the highlighted split is visible.
		if (next != null && typeof document !== 'undefined') {
			document.getElementById(`be-map-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}
	/** @param {number} idx @param {import('$lib/fitness/bestEfforts').BestEffort[]} efforts */
	function beRange(idx, efforts) {
		const km = beActiveKm(idx);
		if (km == null) return null;
		const e = efforts.find((x) => x.km === km);
		return e ? /** @type {[number, number]} */ ([e.startIdx, e.endIdx]) : null;
	}

	// Deep-link highlight via ?highlight= — `5k` pre-pins that best-effort split,
	// `seg:<segmentId>` highlights that segment's effort. Both light the matching
	// stretch up on the run's map and scroll it into view.
	/** @type {{ exIdx: number, startIdx: number, endIdx: number } | null} */
	let segPin = $state(null);
	/** @type {{ exIdx: number, startIdx: number, endIdx: number } | null} */
	let segHover = $state(null);
	/** First exercise index carrying a GPS track (-1 if none). */
	function firstGpsExIdx() {
		const exs = session?.exercises ?? [];
		for (let i = 0; i < exs.length; i++) if ((exs[i].gpsTrack?.length ?? 0) > 0) return i;
		return -1;
	}
	/** An effort's exerciseIndex (null = top-level track) → a rendered map's exIdx. */
	function effortExIdx(/** @type {number|null} */ exerciseIndex) {
		return exerciseIndex != null && (session?.exercises?.[exerciseIndex]?.gpsTrack?.length ?? 0) > 0
			? exerciseIndex
			: firstGpsExIdx();
	}
	/** Highlight for exercise `idx`'s map: a hovered/pinned segment wins over the active split. */
	/** @param {number} idx @param {import('$lib/fitness/bestEfforts').BestEffort[]} efforts */
	function mapHighlight(idx, efforts) {
		const seg = segHover ?? segPin;
		if (seg && seg.exIdx === idx) return /** @type {[number, number]} */ ([seg.startIdx, seg.endIdx]);
		return beRange(idx, efforts);
	}
	/** @param {number} idx */
	function scrollToMap(idx) {
		if (idx < 0 || typeof document === 'undefined') return;
		requestAnimationFrame(() =>
			document.getElementById(`be-map-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		);
	}
	function applyHighlight() {
		const h = page.url.searchParams.get('highlight');
		if (!h) return;
		const km = h.match(/^(\d+)\s*km?$/i);
		if (km) {
			const idx = firstGpsExIdx();
			if (idx >= 0) { beClick[idx] = Number(km[1]); scrollToMap(idx); }
			return;
		}
		const seg = h.match(/^seg(?:ment)?[:-](.+)$/i);
		if (seg) {
			const e = (data.segmentEfforts ?? []).find(
				(/** @type {any} */ x) => x.segmentId === seg[1] || x.effortId === seg[1]
			);
			if (e) {
				const idx = effortExIdx(e.exerciseIndex);
				segPin = { exIdx: idx, startIdx: e.startIdx, endIdx: e.endIdx };
				scrollToMap(idx);
			}
		}
	}

	// Shared y-axis width per exercise so its stacked GPS charts align.
	/** @type {Map<number, import('$lib/stores/axisWidthGroup.svelte').AxisWidthGroup>} */
	const axisGroups = new Map();
	/** @param {number} idx */
	function axisGroupFor(idx) {
		let g = axisGroups.get(idx);
		if (!g) { g = createAxisWidthGroup(); axisGroups.set(idx, g); }
		return g;
	}

	/** @param {number} minPerKm */
	function formatPace(minPerKm) {
		const m = Math.floor(minPerKm);
		const s = Math.round((minPerKm - m) * 60);
		return `${m}:${s.toString().padStart(2, '0')} /km`;
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
				} else {
					const err = await res.json().catch(() => null);
					toast.error(err?.error ?? 'Failed to upload GPX');
				}
			} catch { toast.error('Failed to upload GPX'); }
			uploading = -1;
		};
		input.click();
	}

	/** @param {number} exIdx */
	function downloadGpx(exIdx) {
		window.location.href = `/api/fitness/sessions/${session._id}/gpx?exerciseIdx=${exIdx}`;
	}

	/** @param {number} exIdx */
	async function removeGpx(exIdx) {
		if (!await confirm(t.remove_gps_confirm)) return;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}/gpx`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseIdx: exIdx })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to remove GPX');
			}
		} catch { toast.error('Failed to remove GPX'); }
	}
</script>

<svelte:head>
	<title>{session?.name ?? t.workout_singular} - Bocken</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	{#if data.cardImage}
		<meta property="og:title" content={session?.name ?? t.workout_singular} />
		<meta property="og:image" content={data.cardImage} />
		<meta property="og:image:secure_url" content={data.cardImage} />
		<meta property="og:image:type" content="image/webp" />
		<meta property="og:image:width" content="1080" />
		<meta property="og:image:height" content="1080" />
		<meta property="og:image:alt" content="{session?.name ?? t.workout_singular} — route map" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={data.cardImage} />
		<meta name="twitter:image:alt" content="{session?.name ?? t.workout_singular} — route map" />
	{/if}
</svelte:head>

<div class="session-detail">
	{#if !session}
		<p class="device-only-notice">{t.unsynced_device_only}</p>
	{:else}
	<div class="detail-header">
		<div>
			{#if editing}
				<input class="edit-name-input" type="text" bind:value={editData.name} />
			{:else}
				<h1>
					{session.name}
					{#if unsynced}
						<span class="unsynced-badge" title={t.unsynced_label}>
							<CloudOff size={13} strokeWidth={2} />
							{t.unsynced_label}
						</span>
					{/if}
				</h1>
			{/if}
			<p class="session-date">{formatDate(session.startTime)} · {formatTime(session.startTime)}</p>
		</div>
		<div class="header-actions">
			{#if editing}
				<button class="recalc-btn" onclick={recalculate} disabled={recalculating} title={t.recalc_title}>
					<RefreshCw size={14} class={recalculating ? 'spinning' : ''} />
				</button>
				<button class="save-btn" onclick={saveEdit} disabled={saving}>
					{saving ? t.saving.toUpperCase() : t.save.toUpperCase()}
				</button>
				<button class="cancel-edit-btn" onclick={cancelEdit}>{t.cancel}</button>
			{:else}
				{#if !unsynced}
					<button class="share-btn" onclick={copyLog} aria-label={t.copy_log} title={t.copy_log}>
						<Copy size={16} />
					</button>
					<button class="share-btn" onclick={shareRun} aria-label={t.share} title={t.share}>
						<Share2 size={16} />
					</button>
					<button class="edit-btn" onclick={startEdit} aria-label="Edit session">
						<Pencil size={16} />
					</button>
				{/if}
				<button class="delete-btn" onclick={deleteSession} disabled={deleting} aria-label="Delete session">
					<Trash2 size={18} />
				</button>
			{/if}
		</div>
	</div>

	{#if editing}
		<div class="edit-meta">
			<div class="meta-row">
				<label for="edit-datetime">{t.date}</label>
				<DateTimePicker bind:value={editData.startMs} mode="datetime" {lang} />
			</div>
			<div class="meta-row">
				<label for="edit-duration">{t.duration_min}</label>
				<input id="edit-duration" type="number" min="0" bind:value={editData.duration} />
			</div>
			<div class="meta-row">
				<label for="edit-notes">{t.notes}</label>
				<textarea id="edit-notes" bind:value={editData.notes} rows="2" placeholder={t.notes_placeholder}></textarea>
			</div>
		</div>

		{#if snapTarget}
			<div class="snap-section">
				<h2><Route size={16} /> {t.snap_heading}</h2>
				<div class="snap-map" {@attach mountSnapMap}></div>
				<div class="snap-legend">
					<span class="snap-legend-item">
						<span class="snap-swatch recorded"></span>
						{t.snap_recorded}{#if session.totalDistance} · {session.totalDistance.toFixed(2)} km{/if}
					</span>
					{#if snappedTrack}
						<span class="snap-legend-item">
							<span class="snap-swatch snapped"></span>
							{t.snap_snapped} · {snappedDistance.toFixed(2)} km
						</span>
					{/if}
				</div>

				{#if snapState === 'idle'}
					<button class="snap-btn" onclick={snapToPaths}>{t.snap_to_paths}</button>
				{:else if snapState === 'loading'}
					<button class="snap-btn" disabled>{t.snapping}</button>
				{:else if snapState === 'preview'}
					<p class="snap-hint">{t.snap_choose}</p>
					<div class="snap-choice">
						<button class="snap-choice-btn keep" onclick={() => (snapState = 'kept')}>{t.snap_keep_recorded}</button>
						<button class="snap-choice-btn use" onclick={useSnappedTrack}>{t.snap_use_snapped}</button>
					</div>
				{:else if snapState === 'saving'}
					<button class="snap-btn" disabled>{t.snap_saving}</button>
				{:else if snapState === 'saved'}
					<p class="snap-result"><Check size={16} /> {t.snap_saved}</p>
				{:else if snapState === 'kept'}
					<p class="snap-result"><Check size={16} /> {t.snap_kept}</p>
				{:else if snapState === 'error'}
					<p class="snap-error">{snapError}</p>
					<button class="snap-btn" onclick={snapToPaths}>{t.snap_retry}</button>
				{/if}
			</div>
		{/if}
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
				<div class="stat-pill kcal has-info">
					<Flame size={14} />
					<span>{kcalResult.kcal} &plusmn; {kcalResult.kcal - kcalResult.lower} kcal</span>
					<button class="kcal-info-trigger" onclick={() => showKcalInfo = !showKcalInfo} aria-label="Show estimation sources">
						<Info size={12} />
					</button>
					{#if showKcalInfo}
						<div class="kcal-info-tooltip">
							{#each kcalResult.methods as method}
								{@const cite = METHOD_CITATIONS[method]}
								{#if cite}
									<span class="cite-line">
										{#if cite.doi}
											<a href="https://doi.org/{cite.doi}" target="_blank" rel="noopener">{cite.label}</a>
										{:else}
											{cite.label}
										{/if}
									</span>
								{/if}
							{/each}
						</div>
					{/if}
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
						<span>{t.gps_track_stored}{exData.totalDistance ? ` · ${exData.totalDistance.toFixed(2)} km` : ''}</span>
						<button class="gpx-remove-btn" onclick={() => removeGpx(exIdx)} aria-label="Remove GPS track">
							<X size={14} />
						</button>
					</div>
					{#if exData.gpsTrack?.length >= 2}
						<div class="track-map" {@attach attachTrackMap(exData.gpsTrack, hoverFor(exIdx))}></div>
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
					{t.add_set}
				</button>
			</div>
		{/each}

		<button class="add-exercise-btn" onclick={() => showPicker = true}>
			<Plus size={18} /> {t.add_exercise}
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
							<th>{t.set_header}</th>
							{#each mainMetrics as metric (metric)}
								<th>{METRIC_LABELS[metric]}</th>
							{/each}
							<th>RPE</th>
							{#if showEst1rm}
								<th>{t.est_1rm}</th>
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
					{@const gps = buildGpsView(ex.gpsTrack, { dark, elevationLabel: t.elevation, cadenceLabel: t.cadence })}
					{@const dist = ex.totalDistance ?? gps.dist}
					{@const hov = hoverFor(exIdx)}
					{@const yGroup = axisGroupFor(exIdx)}
					{@const efforts = effortsFor(exIdx, ex.gpsTrack)}
					<div class="gps-track-section">
						<div class="gps-stats">
							<span class="gps-stat accent"><Route size={14} /> {dist.toFixed(2)} km</span>
							{#if gps.avgPace > 0}
								<span class="gps-stat accent"><Gauge size={14} /> {formatPace(gps.avgPace)}</span>
							{/if}
							{#if gps.elevStats}
								<span class="gps-stat elev-gain"><Mountain size={14} /> +{gps.elevStats.gain}{t.elevation_unit}</span>
								<span class="gps-stat elev-loss">-{gps.elevStats.loss}{t.elevation_unit}</span>
							{/if}
						</div>
						<div class="track-map" id={`be-map-${exIdx}`} {@attach attachTrackMap(ex.gpsTrack, hov, { highlight: () => mapHighlight(exIdx, efforts) })}></div>

						{#if gps.hasCharts}
						{#if gps.elevation.has}
							<div class="chart-section">
								<FitnessChart
									data={gps.elevation.data}
									title="{t.elevation} ({t.elevation_unit})"
									height="160px"
									yUnit="m"
									xAxis={gps.xAxis}
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
									yWidthGroup={yGroup}
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

						{#if efforts.length > 0}
							<div class="splits-section best-efforts">
								<h4>{t.best_efforts}</h4>
								<table class="splits-table">
									<thead>
										<tr><th>{t.distance}</th><th>{beKind === 'cycling' ? t.speed : t.pace}</th><th>TIME</th></tr>
									</thead>
									<tbody>
										{#each efforts as e (e.km)}
											<!-- svelte-ignore a11y_mouse_events_have_key_events -->
											<tr
												class="be-row"
												class:active={beActiveKm(exIdx) === e.km}
												class:pinned={beClick[exIdx] === e.km}
												onmouseenter={() => (beHover[exIdx] = e.km)}
												onmouseleave={() => (beHover[exIdx] = null)}
												onclick={() => clickEffort(exIdx, e.km)}
											>
												<td class="split-km">{e.km}{t.km_short}</td>
												<td class="split-pace">{formatEffortRate(e.km, e.seconds, beKind)}</td>
												<td class="split-elapsed">{formatElapsed(e.seconds)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}

						{#if !unsynced}
							<button class="gpx-download-btn" onclick={() => downloadGpx(exIdx)}>
								<Download size={14} />
								{t.download_gpx}
							</button>
						{/if}
					</div>
				{:else if isCardio(ex.exerciseId) && !unsynced}
					<button class="gpx-upload-btn" onclick={() => uploadGpx(exIdx)} disabled={uploading === exIdx}>
						<Upload size={14} />
						{uploading === exIdx ? t.uploading : t.upload_gpx}
					</button>
				{/if}
			</div>
		{/each}
	{/if}

	{#if !editing && data.segmentEfforts?.length > 0}
		<SegmentEffortsList
			efforts={data.segmentEfforts}
			{lang}
			onhighlight={(e) => {
				segHover = e ? { exIdx: effortExIdx(e.exerciseIndex), startIdx: e.startIdx, endIdx: e.endIdx } : null;
			}}
		/>
	{/if}

	{#if !editing && !unsynced && gpsSources.length > 0}
		<section class="create-segment-section">
			{#if creatingSegment}
				{#if gpsSources.length > 1}
					<label class="source-select">
						{t.exercise}
						<select bind:value={createSourceIdx}>
							{#each gpsSources as src, i (i)}<option value={i}>{src.label}</option>{/each}
						</select>
					</label>
				{/if}
				{#key createSourceIdx}
					<SegmentCreator
						track={gpsSources[createSourceIdx].track}
						exerciseIndex={gpsSources[createSourceIdx].exerciseIndex}
						sessionId={session._id}
						{lang}
						oncreated={onSegmentCreated}
						oncancel={() => (creatingSegment = false)}
					/>
				{/key}
			{:else}
				<button class="segment-create-btn" onclick={() => (creatingSegment = true)}>
					<Flag size={16} />
					{t.create_segment}
				</button>
			{/if}
		</section>
	{/if}

	{#if !editing && session.prs?.length > 0}
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

	{#if !editing && session.notes}
		<div class="notes-section">
			<h2>{t.notes}</h2>
			<p>{session.notes}</p>
		</div>
	{/if}
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
	.unsynced-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.5rem;
		padding: 0.15rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--orange, var(--nord12));
		background: color-mix(in srgb, var(--orange, var(--nord12)) 12%, transparent);
		border-radius: 100px;
		vertical-align: middle;
	}
	.device-only-notice {
		color: var(--color-text-secondary);
		text-align: center;
		padding: 3rem 0;
	}
	.header-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}
	.edit-btn,
	.share-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.4rem;
		display: flex;
	}
	.edit-btn:hover,
	.share-btn:hover {
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
	.snap-section {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
	}
	.snap-section h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.95rem;
		margin: 0 0 0.6rem;
	}
	.snap-map {
		width: 100%;
		height: 240px;
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: 0.6rem;
	}
	.snap-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.75rem;
	}
	.snap-legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.snap-swatch {
		width: 1rem;
		height: 0.25rem;
		border-radius: 1000px;
	}
	.snap-swatch.recorded {
		background: #f4511e;
	}
	.snap-swatch.snapped {
		background: #5e81ac;
	}
	.snap-hint {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.6rem;
	}
	.snap-btn {
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
	.snap-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.snap-choice {
		display: flex;
		gap: 0.6rem;
	}
	.snap-choice-btn {
		flex: 1;
		padding: 0.6rem;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.snap-choice-btn.keep {
		background: transparent;
		border: 1.5px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.snap-choice-btn.use {
		background: var(--color-primary);
		border: 1.5px solid var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.snap-result {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--nord14);
		font-weight: 600;
		font-size: 0.9rem;
		margin: 0;
		padding: 0.4rem;
	}
	.snap-error {
		font-size: 0.85rem;
		color: var(--red);
		margin: 0 0 0.6rem;
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
		color: var(--color-text-on-primary);
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
	.stat-pill.has-info {
		position: relative;
	}
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
	.kcal-info-trigger:hover {
		opacity: 0.9;
	}
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
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-text-secondary);
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.kcal-info-tooltip a {
		color: var(--nord12);
		text-decoration: underline;
	}
	.stat-pill.pr {
		color: var(--color-amber-text);
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
		color: var(--color-text-on-primary);
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
		color: var(--color-amber-text);
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
		color: var(--color-amber-text);
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
		color: var(--color-amber-text);
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
	.gpx-download-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.75rem;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.gpx-download-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.segment-create-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.75rem;
		margin-right: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-md);
		color: var(--color-primary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.segment-create-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.create-segment-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.source-select {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.source-select select {
		flex: 1;
		padding: 0.4rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
		font-size: 0.85rem;
	}

	/* GPS charts */
	.chart-section {
		margin-top: 0.25rem;
	}
	.gps-stat.elev-gain {
		color: var(--nord14);
		font-weight: 600;
	}
	.gps-stat.elev-loss {
		color: var(--nord11);
		font-weight: 600;
		font-size: 0.8rem;
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
