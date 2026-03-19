<script>
	import { getExerciseById } from '$lib/data/exercises';
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
	 *       sets: Array<{ reps: number, weight: number, rpe?: number }>
	 *     }>
	 *   }
	 * }}
	 */
	let { session } = $props();

	/** @param {number} secs */
	function formatDuration(secs) {
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
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
	 * @param {Array<{ reps: number, weight: number, rpe?: number }>} sets
	 */
	function bestSet(sets) {
		let best = sets[0];
		for (const s of sets) {
			if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
				best = s;
			}
		}
		return best;
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
			{@const best = bestSet(ex.sets)}
			<div class="exercise-row">
				<span class="ex-sets">{ex.sets.length} &times; {exercise?.name ?? ex.exerciseId}</span>
				{#if best}
					<span class="ex-best">{best.weight} kg &times; {best.reps}{#if best.rpe} @ {best.rpe}{/if}</span>
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
		background: var(--accent-dark);
		border: none;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		padding: 1rem;
		transition: transform 150ms ease, box-shadow 150ms ease;
	}
	.session-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
		color: var(--nord4);
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
		color: var(--nord4);
	}
	.ex-best {
		font-weight: 600;
		font-size: 0.78rem;
	}
	.more {
		color: var(--nord8);
		font-style: italic;
	}
	.card-footer {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--nord4);
		border-top: 1px solid var(--nord3, rgba(0,0,0,0.1));
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

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .session-card {
			background: var(--nord5);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		}
	}
	:global(:root[data-theme="light"]) .session-card {
		background: var(--nord5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}
</style>
