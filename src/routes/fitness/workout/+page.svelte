<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let templateId = $state(null);
  let template = $state(null);
  let currentSession = $state({
    name: '',
    exercises: [],
    startTime: new Date(),
    notes: ''
  });
  let currentExerciseIndex = $state(0);
  let currentSetIndex = $state(0);
  let restTimer = $state({
    active: false,
    timeLeft: 0,
    totalTime: 120
  });
  let restTimerInterval = null;

  onMount(async () => {
    templateId = $page.url.searchParams.get('template');
    
    if (templateId) {
      await loadTemplate();
    } else {
      // Create a blank workout
      currentSession = {
        name: 'Quick Workout',
        exercises: [
          {
            name: '',
            sets: [{ reps: 0, weight: 0, rpe: null, completed: false }],
            restTime: 120,
            notes: ''
          }
        ],
        startTime: new Date(),
        notes: ''
      };
    }
  });

  async function loadTemplate() {
    try {
      const response = await fetch(`/api/fitness/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        template = data.template;
        
        // Convert template to workout session format
        currentSession = {
          name: template.name,
          exercises: template.exercises.map(exercise => ({
            ...exercise,
            sets: exercise.sets.map(set => ({
              ...set,
              completed: false,
              notes: ''
            })),
            notes: ''
          })),
          startTime: new Date(),
          notes: ''
        };
      } else {
        alert('Template not found');
        goto('/fitness/templates');
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      alert('Failed to load template');
      goto('/fitness/templates');
    }
  }

  function startRestTimer(seconds = null) {
    const restTime = seconds || currentSession.exercises[currentExerciseIndex]?.restTime || 120;
    
    restTimer = {
      active: true,
      timeLeft: restTime,
      totalTime: restTime
    };

    if (restTimerInterval) {
      clearInterval(restTimerInterval);
    }

    restTimerInterval = setInterval(() => {
      if (restTimer.timeLeft > 0) {
        restTimer.timeLeft--;
      } else {
        stopRestTimer();
      }
    }, 1000);
  }

  function stopRestTimer() {
    restTimer.active = false;
    if (restTimerInterval) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function markSetCompleted(exerciseIndex, setIndex) {
    currentSession.exercises[exerciseIndex].sets[setIndex].completed = true;
    
    // Auto-start rest timer
    const exercise = currentSession.exercises[exerciseIndex];
    if (exercise.restTime > 0) {
      startRestTimer(exercise.restTime);
    }
  }

  function addExercise() {
    currentSession.exercises = [
      ...currentSession.exercises,
      {
        name: '',
        sets: [{ reps: 0, weight: 0, rpe: null, completed: false }],
        restTime: 120,
        notes: ''
      }
    ];
  }

  function addSet(exerciseIndex) {
    const lastSet = currentSession.exercises[exerciseIndex].sets.slice(-1)[0];
    currentSession.exercises[exerciseIndex].sets = [
      ...currentSession.exercises[exerciseIndex].sets,
      {
        reps: lastSet?.reps || 0,
        weight: lastSet?.weight || 0,
        rpe: null,
        completed: false,
        notes: ''
      }
    ];
  }

  function removeSet(exerciseIndex, setIndex) {
    if (currentSession.exercises[exerciseIndex].sets.length > 1) {
      currentSession.exercises[exerciseIndex].sets = 
        currentSession.exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    }
  }

  async function finishWorkout() {
    if (!confirm('Are you sure you want to finish this workout?')) {
      return;
    }

    stopRestTimer();

    try {
      const endTime = new Date();
      const sessionData = {
        templateId: template?._id,
        name: currentSession.name,
        exercises: currentSession.exercises,
        startTime: currentSession.startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: currentSession.notes
      };

      const response = await fetch('/api/fitness/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        alert('Workout saved successfully!');
        goto('/fitness/sessions');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save workout');
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout');
    }
  }

  function cancelWorkout() {
    if (confirm('Are you sure you want to cancel this workout? All progress will be lost.')) {
      stopRestTimer();
      goto('/fitness');
    }
  }

  // Clean up timer on component destroy
  $effect(() => {
    return () => {
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }
    };
  });
</script>

<div class="workout-page">
  {#if restTimer.active}
    <div class="rest-timer-overlay">
      <div class="rest-timer">
        <h2>Rest Time</h2>
        <div class="timer-display">
          <div class="time">{formatTime(restTimer.timeLeft)}</div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {((restTimer.totalTime - restTimer.timeLeft) / restTimer.totalTime) * 100}%"
            ></div>
          </div>
        </div>
        <div class="timer-controls">
          <button class="timer-btn" onclick={() => restTimer.timeLeft += 30}>+30s</button>
          <button class="timer-btn" onclick={() => restTimer.timeLeft = Math.max(0, restTimer.timeLeft - 30)}>-30s</button>
          <button class="timer-btn skip" onclick={stopRestTimer}>Skip</button>
        </div>
      </div>
    </div>
  {/if}

  <div class="workout-header">
    <div class="workout-info">
      <input 
        type="text" 
        bind:value={currentSession.name} 
        class="workout-name-input"
        placeholder="Workout Name"
      />
      <div class="workout-time">
        Started: {currentSession.startTime.toLocaleTimeString()}
      </div>
    </div>
    <div class="workout-actions">
      <button class="cancel-btn" onclick={cancelWorkout}>Cancel</button>
      <button class="finish-btn" onclick={finishWorkout}>Finish Workout</button>
    </div>
  </div>

  <div class="exercises-container">
    {#each currentSession.exercises as exercise, exerciseIndex}
      <div class="exercise-card">
        <div class="exercise-header">
          <input
            type="text"
            bind:value={exercise.name}
            placeholder="Exercise name"
            class="exercise-name-input"
          />
          <div class="exercise-meta">
            <label>
              Rest: 
              <input
                type="number"
                bind:value={exercise.restTime}
                min="10"
                max="600"
                class="rest-input"
              />s
            </label>
          </div>
        </div>

        <div class="sets-container">
          <div class="sets-header">
            <span>Set</span>
            <span>Previous</span>
            <span>Weight (kg)</span>
            <span>Reps</span>
            <span>RPE</span>
            <span>Actions</span>
          </div>

          {#each exercise.sets as set, setIndex}
            <div class="set-row" class:completed={set.completed}>
              <div class="set-number">{setIndex + 1}</div>
              <div class="previous-data">
                {#if template?.exercises[exerciseIndex]?.sets[setIndex]}
                  {@const prevSet = template.exercises[exerciseIndex].sets[setIndex]}
                  {prevSet.weight || 0}kg × {prevSet.reps}
                  {#if prevSet.rpe}@ {prevSet.rpe}{/if}
                {:else}
                  -
                {/if}
              </div>
              <div class="set-input">
                <input
                  type="number"
                  bind:value={set.weight}
                  min="0"
                  step="0.5"
                  disabled={set.completed}
                  class="weight-input"
                />
              </div>
              <div class="set-input">
                <input
                  type="number"
                  bind:value={set.reps}
                  min="0"
                  disabled={set.completed}
                  class="reps-input"
                />
              </div>
              <div class="set-input">
                <input
                  type="number"
                  bind:value={set.rpe}
                  min="1"
                  max="10"
                  step="0.5"
                  disabled={set.completed}
                  class="rpe-input"
                  placeholder="1-10"
                />
              </div>
              <div class="set-actions">
                {#if !set.completed}
                  <button
                    class="complete-btn"
                    onclick={() => markSetCompleted(exerciseIndex, setIndex)}
                    disabled={!set.reps}
                  >
                    ✓
                  </button>
                {:else}
                  <span class="completed-marker">✅</span>
                {/if}
                {#if exercise.sets.length > 1}
                  <button
                    class="remove-set-btn"
                    onclick={() => removeSet(exerciseIndex, setIndex)}
                  >
                    ✕
                  </button>
                {/if}
              </div>
            </div>
          {/each}

          <div class="set-controls">
            <button class="add-set-btn" onclick={() => addSet(exerciseIndex)}>
              + Add Set
            </button>
            <button 
              class="start-timer-btn" 
              onclick={() => startRestTimer(exercise.restTime)}
              disabled={restTimer.active}
            >
              ⏱️ Start Timer ({formatTime(exercise.restTime)})
            </button>
          </div>
        </div>

        <div class="exercise-notes">
          <textarea
            bind:value={exercise.notes}
            placeholder="Exercise notes..."
            class="notes-input"
          ></textarea>
        </div>
      </div>
    {/each}

    <div class="add-exercise-section">
      <button class="add-exercise-btn" onclick={addExercise}>
        ➕ Add Exercise
      </button>
    </div>
  </div>

  <div class="workout-notes">
    <label for="workout-notes">Workout Notes:</label>
    <textarea
      id="workout-notes"
      bind:value={currentSession.notes}
      placeholder="How did the workout feel? Any observations?"
      class="workout-notes-input"
    ></textarea>
  </div>
</div>

<style>
  .workout-page {
    max-width: 1000px;
    margin: 0 auto;
    padding-bottom: 2rem;
  }

  .rest-timer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .rest-timer {
    background: white;
    padding: 3rem;
    border-radius: 1rem;
    text-align: center;
    min-width: 300px;
  }

  .rest-timer h2 {
    color: #1f2937;
    margin-bottom: 2rem;
  }

  .timer-display {
    margin-bottom: 2rem;
  }

  .time {
    font-size: 4rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 1rem;
    font-family: monospace;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 1s ease;
  }

  .timer-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .timer-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    background: #6b7280;
    color: white;
  }

  .timer-btn.skip {
    background: #3b82f6;
  }

  .timer-btn:hover {
    opacity: 0.9;
  }

  .workout-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .workout-name-input {
    font-size: 1.5rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: #1f2937;
    padding: 0.5rem;
    border-bottom: 2px solid transparent;
  }

  .workout-name-input:focus {
    outline: none;
    border-bottom-color: #3b82f6;
  }

  .workout-time {
    color: #6b7280;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .workout-actions {
    display: flex;
    gap: 1rem;
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .finish-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .exercises-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .exercise-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .exercise-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .exercise-name-input {
    font-size: 1.25rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: #1f2937;
    padding: 0.5rem;
    border-bottom: 2px solid transparent;
    flex: 1;
  }

  .exercise-name-input:focus {
    outline: none;
    border-bottom-color: #3b82f6;
  }

  .exercise-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .rest-input {
    width: 60px;
    padding: 0.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    text-align: center;
  }

  .sets-container {
    margin-bottom: 1rem;
  }

  .sets-header {
    display: grid;
    grid-template-columns: 40px 120px 100px 80px 80px 120px;
    gap: 1rem;
    padding: 0.5rem;
    font-weight: 600;
    color: #6b7280;
    font-size: 0.875rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 0.5rem;
  }

  .set-row {
    display: grid;
    grid-template-columns: 40px 120px 100px 80px 80px 120px;
    gap: 1rem;
    padding: 0.75rem 0.5rem;
    align-items: center;
    border-radius: 0.375rem;
    transition: background-color 0.2s ease;
  }

  .set-row:hover {
    background: #f9fafb;
  }

  .set-row.completed {
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
  }

  .set-number {
    font-weight: 600;
    color: #374151;
  }

  .previous-data {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .set-input input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    text-align: center;
  }

  .set-input input:disabled {
    background: #f9fafb;
    color: #6b7280;
  }

  .set-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .complete-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: bold;
  }

  .complete-btn:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .remove-set-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .completed-marker {
    font-size: 1.2rem;
  }

  .set-controls {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .add-set-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .start-timer-btn {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .start-timer-btn:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .exercise-notes {
    margin-top: 1rem;
  }

  .notes-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    resize: vertical;
    min-height: 60px;
  }

  .add-exercise-section {
    text-align: center;
  }

  .add-exercise-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .workout-notes {
    margin-top: 2rem;
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .workout-notes label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .workout-notes-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    resize: vertical;
    min-height: 100px;
  }

  @media (max-width: 768px) {
    .workout-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .workout-actions {
      justify-content: stretch;
    }
    
    .workout-actions button {
      flex: 1;
    }
    
    .sets-header,
    .set-row {
      grid-template-columns: 30px 80px 70px 60px 60px 80px;
      gap: 0.5rem;
      font-size: 0.75rem;
    }
    
    .exercise-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .set-controls {
      flex-direction: column;
    }
    
    .rest-timer {
      margin: 1rem;
      padding: 2rem;
      min-width: auto;
    }
    
    .time {
      font-size: 3rem;
    }
    
    .timer-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>