<script>
	import { goto } from '$app/navigation';
	import { Plus, Trash2, Play, Pause, Trophy, Clock, Dumbbell, Route, RefreshCw, Check, ChevronUp, ChevronDown } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
	import { onMount } from 'svelte';

	const workout = getWorkout();
	const sync = getWorkoutSync();
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

	onMount(() => {
		if (!workout.active && !completionData) {
			goto('/fitness/workout');
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
	function addExerciseFromPicker(exerciseId) {
		workout.addExercise(exerciseId);
		fetchPreviousData([exerciseId]);
	}

	async function finishWorkout() {
		const sessionData = workout.finish();
		if (sessionData.exercises.length === 0) {
			await sync.onWorkoutEnd();
			await goto('/fitness/workout');
			return;
		}

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
			}
		} catch (err) {
			console.error('[finish] fetch error:', err);
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
			const exercise = getExerciseById(ex.exerciseId);
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

		return {
			sessionId: saved._id,
			name: local.name,
			templateId: local.templateId,
			exercises: local.exercises,
			durationMin,
			totalTonnage,
			totalDistance,
			exerciseSummaries,
			prs
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

				const exercise = getExerciseById(actual.exerciseId);
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
						name: exercise?.name ?? actual.exerciseId,
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

{#if completionData}
	<div class="completion">
		<div class="completion-header">
			<h1>Workout Complete</h1>
			{#if completionData.prs.length > 0}
				<div class="pr-badge">
					<span class="pr-badge-count">{completionData.prs.length}</span>
					<Trophy size={20} />
				</div>
			{/if}
			<p class="completion-name">{completionData.name}</p>
		</div>

		<div class="completion-stats">
			<div class="comp-stat">
				<Clock size={18} />
				<span class="comp-stat-value">{formatDuration(completionData.durationMin)}</span>
				<span class="comp-stat-label">Duration</span>
			</div>
			{#if completionData.totalTonnage > 0}
				<div class="comp-stat">
					<Dumbbell size={18} />
					<span class="comp-stat-value">
						{completionData.totalTonnage >= 1000
							? `${(completionData.totalTonnage / 1000).toFixed(1)}t`
							: `${Math.round(completionData.totalTonnage)} kg`}
					</span>
					<span class="comp-stat-label">Tonnage</span>
				</div>
			{/if}
			{#if completionData.totalDistance > 0}
				<div class="comp-stat">
					<Route size={18} />
					<span class="comp-stat-value">{completionData.totalDistance.toFixed(1)} km</span>
					<span class="comp-stat-label">Distance</span>
				</div>
			{/if}
		</div>

		{#if completionData.prs.length > 0}
			<div class="prs-section">
				<h2><Trophy size={16} /> Personal Records</h2>
				<div class="pr-list">
					{#each completionData.prs as pr}
						<div class="pr-item">
							<span class="pr-exercise">{getExerciseById(pr.exerciseId)?.name ?? pr.exerciseId}</span>
							<span class="pr-detail">{pr.type}: <strong>{pr.value}</strong></span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="exercise-summaries">
			<h2>Exercises</h2>
			{#each completionData.exerciseSummaries as ex}
				<div class="ex-summary">
					<div class="ex-summary-header">
						<span class="ex-summary-name">{getExerciseById(ex.exerciseId)?.name ?? ex.exerciseId}</span>
						<span class="ex-summary-sets">{ex.sets} set{ex.sets !== 1 ? 's' : ''}</span>
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
								<span>{formatPace(ex.pace)} avg</span>
							{/if}
						{:else}
							{#if ex.tonnage > 0}
								<span>{ex.tonnage >= 1000 ? `${(ex.tonnage / 1000).toFixed(1)}t` : `${Math.round(ex.tonnage)} kg`} volume</span>
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
						<span>Template updated</span>
					</div>
				{:else}
					<h2><RefreshCw size={16} /> Update Template</h2>
					<p class="template-update-desc">Your weights or reps differ from the template:</p>
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
											<span class="diff-new">+{diff.newSets.length - diff.oldSets.length} new set{diff.newSets.length - diff.oldSets.length > 1 ? 's' : ''}</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					<button class="update-template-btn" onclick={updateTemplate} disabled={templateUpdateStatus === 'updating'}>
						{templateUpdateStatus === 'updating' ? 'Updating...' : 'Update Template'}
					</button>
				{/if}
			</div>
		{/if}

		<button class="done-btn" onclick={() => goto(`/fitness/history/${completionData.sessionId}`)}>
			VIEW WORKOUT
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
			placeholder="Workout name"
		/>

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
					+ ADD SET
				</button>
			</div>
		{/each}

		<div class="workout-actions">
			<button class="add-exercise-btn" onclick={() => showPicker = true}>
				<Plus size={18} /> ADD EXERCISE
			</button>
			<button class="cancel-btn" onclick={async () => { workout.cancel(); await sync.onWorkoutEnd(); await goto('/fitness/workout'); }}>
				CANCEL WORKOUT
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
			<button class="finish-btn" onclick={finishWorkout}>FINISH</button>
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
		color: white;
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
		color: white;
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
		color: white;
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
</style>
