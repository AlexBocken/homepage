<script>
	import { page } from '$app/stores';
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import { Clock, Weight, Trophy, Route, Gauge } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';

	const sl = $derived(fitnessSlugs(detectFitnessLang($page.url.pathname)));

	/**
	 * @type {{
	 *   session: {
	 *     _id: string,
	 *     name: string,
	 *     startTime: string,
	 *     duration?: number,
	 *     totalVolume?: number,
	 *     totalDistance?: number,
	 *     prs?: Array<any>,
	 *     exercises: Array<{
	 *       exerciseId: string,
	 *       totalDistance?: number,
	 *       gpsPreview?: number[][],
	 *       sets: Array<{ reps?: number, weight?: number, rpe?: number, distance?: number, duration?: number }>
	 *     }>
	 *   }
	 * }}
	 */
	let { session } = $props();

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
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}

	/** @param {string} dateStr */
	function formatTime(dateStr) {
		const d = new Date(dateStr);
		return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	/** @param {number} minPerKm */
	function formatPace(minPerKm) {
		const m = Math.floor(minPerKm);
		const s = Math.round((minPerKm - m) * 60);
		return `${m}:${s.toString().padStart(2, '0')} /km`;
	}

	/**
	 * @param {Array<Record<string, any>>} sets
	 * @param {string} exerciseId
	 */
	function bestSetLabel(sets, exerciseId) {
		const exercise = getExerciseById(exerciseId);
		const metrics = getExerciseMetrics(exercise);
		const isCardio = metrics.includes('distance');

		if (isCardio) {
			let best = sets[0];
			for (const s of sets) {
				if ((s.distance ?? 0) > (best.distance ?? 0)) best = s;
			}
			const parts = [];
			if (best.distance) parts.push(`${best.distance} km`);
			if (best.duration) parts.push(`${best.duration} min`);
			return parts.join(' · ') || null;
		}

		let best = sets[0];
		for (const s of sets) {
			if ((s.weight ?? 0) > (best.weight ?? 0) || ((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? 0) > (best.reps ?? 0))) {
				best = s;
			}
		}
		let label = `${best.weight ?? 0} kg × ${best.reps ?? 0}`;
		if (best.rpe) label += ` @ ${best.rpe}`;
		return label;
	}

	/** Find first GPS preview from cardio exercises */
	const gpsPreview = $derived.by(() => {
		for (const ex of session.exercises) {
			if (ex.gpsPreview && ex.gpsPreview.length >= 2) return ex.gpsPreview;
		}
		return null;
	});

	/** Build SVG polyline with cosine-corrected coordinates */
	const svgData = $derived.by(() => {
		if (!gpsPreview) return null;
		const lats = gpsPreview.map(p => p[0]);
		const lngs = gpsPreview.map(p => p[1]);
		const minLat = Math.min(...lats), maxLat = Math.max(...lats);
		const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
		const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
		const geoW = (maxLng - minLng) * cosLat || 0.001;
		const geoH = maxLat - minLat || 0.001;
		const pad = Math.max(geoW, geoH) * 0.1;
		const vbW = geoW + pad * 2;
		const vbH = geoH + pad * 2;
		const points = gpsPreview.map(p => {
			const x = (p[1] - minLng) * cosLat + pad;
			const y = (maxLat - p[0]) + pad;
			return `${x},${y}`;
		}).join(' ');
		return { points, viewBox: `0 0 ${vbW} ${vbH}` };
	});

	/** Check if this session has any cardio exercise with GPS data */
	const hasGpsCardio = $derived(session.exercises.some(ex => {
		const exercise = getExerciseById(ex.exerciseId);
		return exercise?.bodyPart === 'cardio' && ex.totalDistance;
	}));

	/** Get cardio summary: total distance and average pace */
	const cardioSummary = $derived.by(() => {
		let dist = 0;
		let dur = 0;
		for (const ex of session.exercises) {
			const exercise = getExerciseById(ex.exerciseId);
			if (exercise?.bodyPart !== 'cardio') continue;
			if (ex.totalDistance) {
				dist += ex.totalDistance;
			}
			for (const s of ex.sets) {
				if (s.distance) dist += 0; // already counted via totalDistance
				if (s.duration) dur += s.duration;
			}
		}
		// Use session-level totalDistance if available
		if (session.totalDistance) dist = session.totalDistance;
		const pace = dist > 0 && dur > 0 ? dur / dist : 0;
		return { distance: dist, duration: dur, pace };
	});
</script>

<a href="/fitness/{sl.history}/{session._id}" class="session-card">
	<div class="card-top">
		<h3 class="session-name">{session.name}</h3>
		<span class="session-date">{formatDate(session.startTime)} &middot; {formatTime(session.startTime)}</span>
	</div>

	{#if svgData}
		<div class="map-preview">
			<svg viewBox={svgData.viewBox} preserveAspectRatio="xMidYMid meet">
				<polyline
					points={svgData.points}
					fill="none"
					stroke="var(--color-primary)"
					stroke-width="2.5"
					stroke-linejoin="round"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
		</div>
	{/if}

	<div class="exercise-list">
		{#each session.exercises as ex (ex.exerciseId)}
			{@const exercise = getExerciseById(ex.exerciseId)}
			{@const label = bestSetLabel(ex.sets, ex.exerciseId)}
			<div class="exercise-row">
				<span class="ex-sets">{ex.sets.length} &times; {exercise?.name ?? ex.exerciseId}</span>
				{#if label}
					<span class="ex-best">{label}</span>
				{/if}
			</div>
		{/each}
	</div>

	<div class="card-footer">
		{#if session.duration}
			<span class="stat"><Clock size={14} /> {formatDuration(session.duration)}</span>
		{/if}
		{#if hasGpsCardio && cardioSummary.distance > 0}
			<span class="stat accent"><Route size={14} /> {cardioSummary.distance.toFixed(1)} km</span>
			{#if cardioSummary.pace > 0}
				<span class="stat accent"><Gauge size={14} /> {formatPace(cardioSummary.pace)}</span>
			{/if}
		{:else if session.totalVolume}
			<span class="stat"><Weight size={14} /> {session.totalVolume >= 1000 ? `${(session.totalVolume / 1000).toFixed(1)}t` : `${Math.round(session.totalVolume).toLocaleString()} kg`}</span>
		{/if}
		{#if session.prs && session.prs.length > 0}
			<span class="stat pr"><Trophy size={14} /> {session.prs.length} PR{session.prs.length > 1 ? 's' : ''}</span>
		{/if}
	</div>
</a>

<style>
	.session-card {
		display: block;
		text-decoration: none;
		color: inherit;
		background: var(--color-surface);
		border: none;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
		transition: transform 150ms ease, box-shadow 150ms ease;
	}
	.session-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
	.session-card:active {
		transform: translateY(0);
	}
	.card-top {
		margin-bottom: 0.6rem;
	}
	.session-name {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0;
	}
	.session-date {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.map-preview {
		height: 150px;
		margin-bottom: 0.5rem;
		background: color-mix(in srgb, var(--color-primary) 6%, transparent);
		border-radius: 6px;
		overflow: hidden;
	}
	.map-preview svg {
		width: 100%;
		height: 100%;
	}
	.exercise-list {
		font-size: 0.8rem;
		margin-bottom: 0.6rem;
	}
	.exercise-row {
		display: flex;
		justify-content: space-between;
		padding: 0.15rem 0;
	}
	.ex-sets {
		color: var(--color-text-secondary);
	}
	.ex-best {
		font-weight: 600;
		font-size: 0.78rem;
	}
	.card-footer {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		border-top: 1px solid var(--color-border);
		padding-top: 0.5rem;
		flex-wrap: wrap;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.stat.accent {
		color: var(--color-primary);
		font-weight: 700;
	}
	.stat.pr {
		color: var(--nord13);
	}
</style>
