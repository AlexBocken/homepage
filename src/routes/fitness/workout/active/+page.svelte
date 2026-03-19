<script>
	import { goto } from '$app/navigation';
	import { Plus, Trash2, Play, Pause } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SetTable from '$lib/components/fitness/SetTable.svelte';
	import RestTimer from '$lib/components/fitness/RestTimer.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
	import { onMount } from 'svelte';

	const workout = getWorkout();
	const sync = getWorkoutSync();
	let showPicker = $state(false);

	/** @type {Record<string, Array<Record<string, any>>>} */
	let previousData = $state({});

	onMount(() => {
		if (!workout.active) {
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
				goto('/fitness/history');
			}
		} catch (err) {
			console.error('[finish] fetch error:', err);
			await sync.onWorkoutEnd();
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

	// Fetch previous data for existing exercises on mount
	onMount(() => {
		if (workout.active && workout.exercises.length > 0) {
			fetchPreviousData(workout.exercises.map((/** @type {any} */ e) => e.exerciseId));
		}
	});
</script>

{#if workout.active}
	<div class="active-workout">
		<div class="workout-topbar">
			<div class="topbar-left">
				<button class="pause-btn" onclick={() => workout.paused ? workout.resumeTimer() : workout.pauseTimer()} aria-label={workout.paused ? 'Resume' : 'Pause'}>
					{#if workout.paused}<Play size={16} />{:else}<Pause size={16} />{/if}
				</button>
				<span class="elapsed" class:paused={workout.paused}>{formatElapsed(workout.elapsedSeconds)}</span>
				<SyncIndicator status={sync.status} />
			</div>
			<button class="finish-btn" onclick={finishWorkout}>FINISH</button>
		</div>

		<input
			class="workout-name-input"
			type="text"
			bind:value={workout.name}
			placeholder="Workout name"
		/>

		{#if workout.restTimerActive}
			<div class="rest-timer-section">
				<RestTimer
					seconds={workout.restTimerSeconds}
					total={workout.restTimerTotal}
					onComplete={() => workout.cancelRestTimer()}
				/>
				<div class="rest-controls">
					<button class="rest-adjust" onclick={() => workout.adjustRestTimer(-30)}>-30s</button>
					<button class="skip-rest" onclick={() => workout.cancelRestTimer()}>Skip</button>
					<button class="rest-adjust" onclick={() => workout.adjustRestTimer(30)}>+30s</button>
				</div>
			</div>
		{/if}

		{#each workout.exercises as ex, exIdx (exIdx)}
			<div class="exercise-block">
				<div class="exercise-header">
					<ExerciseName exerciseId={ex.exerciseId} />
					<button
						class="remove-exercise"
						onclick={() => workout.removeExercise(exIdx)}
						aria-label="Remove exercise"
					>
						<Trash2 size={16} />
					</button>
				</div>

				<SetTable
					sets={ex.sets}
					previousSets={previousData[ex.exerciseId] ?? null}
					metrics={getExerciseMetrics(getExerciseById(ex.exerciseId))}
					editable={true}
					onUpdate={(setIdx, d) => workout.updateSet(exIdx, setIdx, d)}
					onToggleComplete={(setIdx) => {
						workout.toggleSetComplete(exIdx, setIdx);
						if (ex.sets[setIdx]?.completed && !workout.restTimerActive) {
							workout.startRestTimer(ex.restTime);
						}
					}}
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
			<button class="cancel-btn" onclick={async () => { workout.cancel(); await sync.onWorkoutEnd(); goto('/fitness/workout'); }}>
				CANCEL WORKOUT
			</button>
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
	.active-workout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.workout-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		position: sticky;
		top: 3.5rem;
		background: var(--color-bg-primary);
		z-index: 10;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
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

	.rest-timer-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 0;
	}
	.rest-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.rest-adjust {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
	}
	.rest-adjust:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.skip-rest {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 600;
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
