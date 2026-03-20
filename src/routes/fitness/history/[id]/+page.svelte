<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { Clock, Weight, Trophy, Trash2, Pencil, Plus } from 'lucide-svelte';
	import { getExerciseById, getExerciseMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';

	let { data } = $props();

	const session = $derived(data.session);
	let deleting = $state(false);
	let editing = $state(false);
	let saving = $state(false);
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
		const exercise = getExerciseById(exerciseId);
		editData.exercises = [
			...editData.exercises,
			{
				exerciseId,
				name: exercise?.name ?? exerciseId,
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

	async function deleteSession() {
		if (!confirm('Delete this workout session?')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/fitness/sessions/${session._id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto('/fitness/history');
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
</script>

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
				<button class="save-btn" onclick={saveEdit} disabled={saving}>
					{saving ? 'SAVING...' : 'SAVE'}
				</button>
				<button class="cancel-edit-btn" onclick={cancelEdit}>CANCEL</button>
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
				<label for="edit-date">Date</label>
				<input id="edit-date" type="date" bind:value={editData.date} />
			</div>
			<div class="meta-row">
				<label for="edit-time">Time</label>
				<input id="edit-time" type="time" bind:value={editData.time} />
			</div>
			<div class="meta-row">
				<label for="edit-duration">Duration (min)</label>
				<input id="edit-duration" type="number" min="0" bind:value={editData.duration} />
			</div>
			<div class="meta-row">
				<label for="edit-notes">Notes</label>
				<textarea id="edit-notes" bind:value={editData.notes} rows="2" placeholder="Workout notes..."></textarea>
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
					+ ADD SET
				</button>
			</div>
		{/each}

		<button class="add-exercise-btn" onclick={() => showPicker = true}>
			<Plus size={18} /> ADD EXERCISE
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
							<th>SET</th>
							{#each mainMetrics as metric (metric)}
								<th>{METRIC_LABELS[metric]}</th>
							{/each}
							<th>RPE</th>
							{#if showEst1rm}
								<th>EST. 1RM</th>
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
			</div>
		{/each}
	{/if}

	{#if !editing && session.prs?.length > 0}
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

	{#if !editing && session.notes}
		<div class="notes-section">
			<h2>Notes</h2>
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
</style>
