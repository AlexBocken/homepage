<script>
  import { onMount } from 'svelte';

  let templates = $state([]);
  let showCreateForm = $state(false);
  let newTemplate = $state({
    name: '',
    description: '',
    exercises: [
      {
        name: '',
        sets: [{ reps: 10, weight: 0, rpe: null }],
        restTime: 120
      }
    ],
    isPublic: false
  });

  onMount(async () => {
    await loadTemplates();
  });

  async function loadTemplates() {
    try {
      const response = await fetch('/api/fitness/templates?include_public=true');
      if (response.ok) {
        const data = await response.json();
        templates = data.templates;
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function createTemplate(event) {
    event.preventDefault();
    try {
      const response = await fetch('/api/fitness/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        showCreateForm = false;
        resetForm();
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    }
  }

  async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fitness/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  }

  function resetForm() {
    newTemplate = {
      name: '',
      description: '',
      exercises: [
        {
          name: '',
          sets: [{ reps: 10, weight: 0, rpe: null }],
          restTime: 120
        }
      ],
      isPublic: false
    };
  }

  function addExercise() {
    newTemplate.exercises = [
      ...newTemplate.exercises,
      {
        name: '',
        sets: [{ reps: 10, weight: 0, rpe: null }],
        restTime: 120
      }
    ];
  }

  function removeExercise(index) {
    newTemplate.exercises = newTemplate.exercises.filter((_, i) => i !== index);
  }

  function addSet(exerciseIndex) {
    newTemplate.exercises[exerciseIndex].sets = [
      ...newTemplate.exercises[exerciseIndex].sets,
      { reps: 10, weight: 0, rpe: null }
    ];
  }

  function removeSet(exerciseIndex, setIndex) {
    newTemplate.exercises[exerciseIndex].sets = newTemplate.exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
  }

  function formatRestTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}:00`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
</script>

<div class="templates-page">
  <div class="page-header">
    <h1>Workout Templates</h1>
    <button class="create-btn" onclick={() => showCreateForm = true}>
      <span class="icon">➕</span>
      Create Template
    </button>
  </div>

  {#if showCreateForm}
    <div class="create-form-overlay">
      <div class="create-form">
        <div class="form-header">
          <h2>Create New Template</h2>
          <button class="close-btn" onclick={() => showCreateForm = false}>✕</button>
        </div>

        <form onsubmit={createTemplate}>
          <div class="form-group">
            <label for="name">Template Name</label>
            <input
              id="name"
              type="text"
              bind:value={newTemplate.name}
              required
              placeholder="e.g., Push Day"
            />
          </div>

          <div class="form-group">
            <label for="description">Description (optional)</label>
            <textarea
              id="description"
              bind:value={newTemplate.description}
              placeholder="Brief description of this workout..."
            ></textarea>
          </div>

          <div class="exercises-section">
            <h3>Exercises</h3>
            
            {#each newTemplate.exercises as exercise, exerciseIndex}
              <div class="exercise-form">
                <div class="exercise-header">
                  <input
                    type="text"
                    bind:value={exercise.name}
                    placeholder="Exercise name (e.g., Barbell Squat)"
                    class="exercise-name-input"
                    required
                  />
                  <div class="rest-time-input">
                    <label>Rest: </label>
                    <input
                      type="number"
                      bind:value={exercise.restTime}
                      min="10"
                      max="600"
                      class="rest-input"
                    />
                    <span>sec</span>
                  </div>
                  {#if newTemplate.exercises.length > 1}
                    <button
                      type="button"
                      class="remove-exercise-btn"
                      onclick={() => removeExercise(exerciseIndex)}
                    >
                      🗑️
                    </button>
                  {/if}
                </div>

                <div class="sets-section">
                  <div class="sets-header">
                    <span>Sets</span>
                    <button
                      type="button"
                      class="add-set-btn"
                      onclick={() => addSet(exerciseIndex)}
                    >
                      + Add Set
                    </button>
                  </div>
                  
                  {#each exercise.sets as set, setIndex}
                    <div class="set-form">
                      <span class="set-number">Set {setIndex + 1}</span>
                      <div class="set-inputs">
                        <label>
                          Reps:
                          <input
                            type="number"
                            bind:value={set.reps}
                            min="1"
                            required
                            class="reps-input"
                          />
                        </label>
                        <label>
                          Weight (kg):
                          <input
                            type="number"
                            bind:value={set.weight}
                            min="0"
                            step="0.5"
                            class="weight-input"
                          />
                        </label>
                        <label>
                          RPE:
                          <input
                            type="number"
                            bind:value={set.rpe}
                            min="1"
                            max="10"
                            step="0.5"
                            class="rpe-input"
                          />
                        </label>
                      </div>
                      {#if exercise.sets.length > 1}
                        <button
                          type="button"
                          class="remove-set-btn"
                          onclick={() => removeSet(exerciseIndex, setIndex)}
                        >
                          ✕
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}

            <button type="button" class="add-exercise-btn" onclick={addExercise}>
              ➕ Add Exercise
            </button>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={newTemplate.isPublic} />
              Make this template public (other users can see and use it)
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="cancel-btn" onclick={() => showCreateForm = false}>
              Cancel
            </button>
            <button type="submit" class="submit-btn">Create Template</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <div class="templates-grid">
    {#if templates.length === 0}
      <div class="empty-state">
        <p>No templates found. Create your first template to get started!</p>
      </div>
    {:else}
      {#each templates as template}
        <div class="template-card">
          <div class="template-header">
            <h3>{template.name}</h3>
            {#if template.isPublic}
              <span class="public-badge">Public</span>
            {/if}
          </div>
          
          {#if template.description}
            <p class="template-description">{template.description}</p>
          {/if}
          
          <div class="template-exercises">
            <h4>Exercises ({template.exercises.length}):</h4>
            <ul>
              {#each template.exercises as exercise}
                <li>
                  <strong>{exercise.name}</strong> - {exercise.sets.length} sets
                  <small>(Rest: {formatRestTime(exercise.restTime || 120)})</small>
                </li>
              {/each}
            </ul>
          </div>
          
          <div class="template-meta">
            <small>Created: {new Date(template.createdAt).toLocaleDateString()}</small>
          </div>
          
          <div class="template-actions">
            <a href="/fitness/workout?template={template._id}" class="start-workout-btn">
              🏋️ Start Workout
            </a>
            <button
              class="delete-btn"
              onclick={() => deleteTemplate(template._id)}
              title="Delete template"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .templates-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }

  .create-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .create-btn:hover {
    background: #2563eb;
  }

  .create-form-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .create-form {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .form-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .form-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .exercises-section {
    margin: 1.5rem 0;
  }

  .exercises-section h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .exercise-form {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background: #f9fafb;
  }

  .exercise-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .exercise-name-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  .rest-time-input {
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
  }

  .remove-exercise-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .sets-section {
    margin-top: 1rem;
  }

  .sets-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .add-set-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .set-form {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: white;
    border-radius: 0.25rem;
  }

  .set-number {
    font-weight: 500;
    min-width: 40px;
  }

  .set-inputs {
    display: flex;
    gap: 1rem;
    flex: 1;
  }

  .set-inputs label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .reps-input,
  .weight-input,
  .rpe-input {
    width: 60px;
    padding: 0.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
  }

  .remove-set-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .add-exercise-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    display: block;
    margin: 1rem auto 0;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    justify-content: end;
    gap: 1rem;
    margin-top: 2rem;
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .submit-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .template-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
  }

  .template-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .template-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .public-badge {
    background: #10b981;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .template-description {
    color: #6b7280;
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
  }

  .template-exercises h4 {
    font-size: 1rem;
    font-weight: 500;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .template-exercises ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .template-exercises li {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .template-exercises li strong {
    color: #374151;
  }

  .template-exercises small {
    display: block;
    margin-top: 0.125rem;
    color: #9ca3af;
  }

  .template-meta {
    margin: 1rem 0;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .template-meta small {
    color: #9ca3af;
  }

  .template-actions {
    display: flex;
    justify-content: between;
    align-items: center;
  }

  .start-workout-btn {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .start-workout-btn:hover {
    background: #2563eb;
  }

  .delete-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .delete-btn:hover {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    .templates-grid {
      grid-template-columns: 1fr;
    }
    
    .create-form {
      margin: 0;
      border-radius: 0;
      max-height: 100vh;
      width: 100%;
    }
    
    .exercise-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .set-inputs {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>