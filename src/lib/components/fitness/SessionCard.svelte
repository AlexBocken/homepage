<script>
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import { Clock, Weight, Trophy } from 'lucide-svelte';

	/**
	 * @type {{
	 *   session: {
	 *     _id: string,
	 *     name: string,
	 *     startTime: string,
	 *     duration?: number,
	 *     totalVolume?: number,
	 *     prs?: Array<any>,
	 *     exercises: Array<{
	 *       exerciseId: string,
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
			if (best.rpe) parts.push(`@ ${best.rpe}`);
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
</script>

<a href="/fitness/history/{session._id}" class="session-card">
	<div class="card-top">
		<h3 class="session-name">{session.name}</h3>
		<span class="session-date">{formatDate(session.startTime)} &middot; {formatTime(session.startTime)}</span>
	</div>

	<div class="exercise-list">
		{#each session.exercises.slice(0, 4) as ex (ex.exerciseId)}
			{@const exercise = getExerciseById(ex.exerciseId)}
			{@const label = bestSetLabel(ex.sets, ex.exerciseId)}
			<div class="exercise-row">
				<span class="ex-sets">{ex.sets.length} &times; {exercise?.name ?? ex.exerciseId}</span>
				{#if label}
					<span class="ex-best">{label}</span>
				{/if}
			</div>
		{/each}
		{#if session.exercises.length > 4}
			<div class="exercise-row more">+{session.exercises.length - 4} more exercises</div>
		{/if}
	</div>

	<div class="card-footer">
		{#if session.duration}
			<span class="stat"><Clock size={14} /> {formatDuration(session.duration)}</span>
		{/if}
		{#if session.totalVolume}
			<span class="stat"><Weight size={14} /> {Math.round(session.totalVolume).toLocaleString()} kg</span>
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
	.more {
		color: var(--color-primary);
		font-style: italic;
	}
	.card-footer {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		border-top: 1px solid var(--color-border);
		padding-top: 0.5rem;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.stat.pr {
		color: var(--nord13);
	}
</style>
