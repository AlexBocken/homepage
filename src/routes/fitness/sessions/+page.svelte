<script>
  import { onMount } from 'svelte';

  let sessions = $state([]);
  let loading = $state(true);

  onMount(async () => {
    await loadSessions();
  });

  async function loadSessions() {
    loading = true;
    try {
      const response = await fetch('/api/fitness/sessions?limit=50');
      if (response.ok) {
        const data = await response.json();
        sessions = data.sessions;
      } else {
        console.error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      loading = false;
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this workout session?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fitness/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSessions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(minutes) {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function getTotalSets(session) {
    return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  }

  function getCompletedSets(session) {
    return session.exercises.reduce((total, exercise) => 
      total + exercise.sets.filter(set => set.completed).length, 0
    );
  }
</script>

<div class="sessions-page">
  <div class="page-header">
    <h1>Workout Sessions</h1>
    <a href="/fitness/workout" class="start-workout-btn">
      🏋️ Start New Workout
    </a>
  </div>

  {#if loading}
    <div class="loading">Loading sessions...</div>
  {:else if sessions.length === 0}
    <div class="empty-state">
      <div class="empty-icon">💪</div>
      <h2>No workout sessions yet</h2>
      <p>Start your fitness journey by creating your first workout!</p>
      <a href="/fitness/workout" class="cta-btn">Start Your First Workout</a>
    </div>
  {:else}
    <div class="sessions-grid">
      {#each sessions as session}
        <div class="session-card">
          <div class="session-header">
            <h3>{session.name}</h3>
            <div class="session-date">
              <div class="date">{formatDate(session.startTime)}</div>
              <div class="time">{formatTime(session.startTime)}</div>
            </div>
          </div>

          <div class="session-stats">
            <div class="stat">
              <span class="stat-label">Duration</span>
              <span class="stat-value">{formatDuration(session.duration)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Exercises</span>
              <span class="stat-value">{session.exercises.length}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Sets</span>
              <span class="stat-value">{getCompletedSets(session)}/{getTotalSets(session)}</span>
            </div>
          </div>

          <div class="session-exercises">
            <h4>Exercises:</h4>
            <ul class="exercise-list">
              {#each session.exercises as exercise}
                <li class="exercise-item">
                  <span class="exercise-name">{exercise.name}</span>
                  <span class="exercise-sets">{exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets</span>
                </li>
              {/each}
            </ul>
          </div>

          {#if session.notes}
            <div class="session-notes">
              <h4>Notes:</h4>
              <p>{session.notes}</p>
            </div>
          {/if}

          <div class="session-actions">
            {#if session.templateId}
              <a href="/fitness/workout?template={session.templateId}" class="repeat-btn">
                🔄 Repeat Workout
              </a>
            {/if}
            <button 
              class="delete-btn"
              onclick={() => deleteSession(session._id)}
              title="Delete session"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sessions-page {
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

  .start-workout-btn {
    background: #3b82f6;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .start-workout-btn:hover {
    background: #2563eb;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .cta-btn {
    background: #3b82f6;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    display: inline-block;
  }

  .cta-btn:hover {
    background: #2563eb;
  }

  .sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .session-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
  }

  .session-header {
    display: flex;
    justify-content: between;
    align-items: start;
    margin-bottom: 1rem;
  }

  .session-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .session-date {
    text-align: right;
    font-size: 0.875rem;
  }

  .date {
    color: #1f2937;
    font-weight: 500;
  }

  .time {
    color: #6b7280;
  }

  .session-stats {
    display: flex;
    justify-content: around;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .stat {
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-top: 0.25rem;
  }

  .session-exercises {
    margin-bottom: 1rem;
  }

  .session-exercises h4 {
    font-size: 1rem;
    font-weight: 500;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .exercise-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .exercise-item {
    display: flex;
    justify-content: between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .exercise-item:last-child {
    border-bottom: none;
  }

  .exercise-name {
    font-weight: 500;
    color: #1f2937;
  }

  .exercise-sets {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .session-notes {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #fef3c7;
    border-radius: 0.5rem;
    border-left: 4px solid #f59e0b;
  }

  .session-notes h4 {
    font-size: 0.875rem;
    font-weight: 500;
    color: #92400e;
    margin: 0 0 0.5rem 0;
  }

  .session-notes p {
    margin: 0;
    color: #92400e;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .session-actions {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .repeat-btn {
    background: #10b981;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .repeat-btn:hover {
    background: #059669;
  }

  .delete-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .delete-btn:hover {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    .sessions-grid {
      grid-template-columns: 1fr;
    }
    
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .session-header {
      flex-direction: column;
      align-items: start;
      gap: 0.5rem;
    }
    
    .session-date {
      text-align: left;
    }
    
    .session-stats {
      justify-content: space-around;
    }
    
    .session-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .repeat-btn {
      align-self: stretch;
      justify-content: center;
    }
  }
</style>