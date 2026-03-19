<script>
	import { goto } from '$app/navigation';
	import { Clock, Weight, Trophy, Trash2 } from 'lucide-svelte';
	import { getExerciseById } from '$lib/data/exercises';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';

	let { data } = $props();

	const session = $derived(data.session);
	let deleting = $state(false);

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

	async function deleteSession() {
		if (!confirm('Delete this workout session?')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}`, { method: 'DELETE' });
			if (res.ok) {
				goto('/fitness/history');
			}
		} catch {}
		deleting = false;
	}
</script>

<div class="session-detail">
	<div class="detail-header">
		<div>
			<h1>{session.name}</h1>
			<p class="session-date">{formatDate(session.startTime)} · {formatTime(session.startTime)}</p>
		</div>
		<button class="delete-btn" onclick={deleteSession} disabled={deleting} aria-label="Delete session">
			<Trash2 size={18} />
		</button>
	</div>

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
		{#if session.prs?.length > 0}
			<div class="stat-pill pr">
				<Trophy size={14} />
				<span>{session.prs.length} PR{session.prs.length !== 1 ? 's' : ''}</span>
			</div>
		{/if}
	</div>

	{#each session.exercises as ex, exIdx (ex.exerciseId + '-' + exIdx)}
		<div class="exercise-block">
			<h3 class="exercise-title">
				<ExerciseName exerciseId={ex.exerciseId} />
			</h3>
			<table class="sets-table">
				<thead>
					<tr>
						<th>SET</th>
						<th>KG</th>
						<th>REPS</th>
						<th>RPE</th>
						<th>EST. 1RM</th>
					</tr>
				</thead>
				<tbody>
					{#each ex.sets as set, i (i)}
						<tr>
							<td class="set-num">{i + 1}</td>
							<td>{set.weight ?? '—'}</td>
							<td>{set.reps ?? '—'}</td>
							<td class="rpe">{set.rpe ?? '—'}</td>
							<td class="est1rm">{set.weight && set.reps ? epley1rm(set.weight, set.reps) : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}

	{#if session.prs?.length > 0}
		<div class="prs-section">
			<h2>Personal Records</h2>
			<div class="pr-list">
				{#each session.prs as pr (pr.exerciseId + pr.type)}
					{@const exercise = getExerciseById(pr.exerciseId)}
					<div class="pr-item">
						<Trophy size={14} class="pr-icon" />
						<span class="pr-exercise">{exercise?.name ?? pr.exerciseId}</span>
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

	{#if session.notes}
		<div class="notes-section">
			<h2>Notes</h2>
			<p>{session.notes}</p>
		</div>
	{/if}
</div>

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
	.exercise-title {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
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
</style>
