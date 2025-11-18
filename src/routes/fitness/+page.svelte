<script>
  import { onMount } from 'svelte';

  let recentSessions = $state([]);
  let templates = $state([]);
  let stats = $state({
    totalSessions: 0,
    totalTemplates: 0,
    thisWeek: 0
  });

  onMount(async () => {
    await Promise.all([
      loadRecentSessions(),
      loadTemplates(),
      loadStats()
    ]);
  });

  async function loadRecentSessions() {
    try {
      const response = await fetch('/api/fitness/sessions?limit=5');
      if (response.ok) {
        const data = await response.json();
        recentSessions = data.sessions;
      }
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  }

  async function loadTemplates() {
    try {
      const response = await fetch('/api/fitness/templates');
      if (response.ok) {
        const data = await response.json();
        templates = data.templates.slice(0, 3); // Show only 3 most recent
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function loadStats() {
    try {
      const [sessionsResponse, templatesResponse] = await Promise.all([
        fetch('/api/fitness/sessions'),
        fetch('/api/fitness/templates')
      ]);

      if (sessionsResponse.ok && templatesResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        const templatesData = await templatesResponse.json();

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const thisWeekSessions = sessionsData.sessions.filter(session => 
          new Date(session.startTime) > oneWeekAgo
        );

        stats = {
          totalSessions: sessionsData.total,
          totalTemplates: templatesData.templates.length,
          thisWeek: thisWeekSessions.length
        };
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
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

  async function createExampleTemplate() {
    try {
      const response = await fetch('/api/fitness/seed-example', {
        method: 'POST'
      });

      if (response.ok) {
        await loadTemplates();
        alert('Example template created successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create example template');
      }
    } catch (error) {
      console.error('Failed to create example template:', error);
      alert('Failed to create example template');
    }
  }
</script>

<div class="dashboard">
  <div class="dashboard-header">
    <h1>Fitness Dashboard</h1>
    <p>Track your progress and stay motivated!</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">💪</div>
      <div class="stat-content">
        <div class="stat-number">{stats.totalSessions}</div>
        <div class="stat-label">Total Workouts</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">📋</div>
      <div class="stat-content">
        <div class="stat-number">{stats.totalTemplates}</div>
        <div class="stat-label">Templates</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">🔥</div>
      <div class="stat-content">
        <div class="stat-number">{stats.thisWeek}</div>
        <div class="stat-label">This Week</div>
      </div>
    </div>
  </div>

  <div class="dashboard-content">
    <div class="section">
      <div class="section-header">
        <h2>Recent Workouts</h2>
        <a href="/fitness/sessions" class="view-all">View All</a>
      </div>
      
      {#if recentSessions.length === 0}
        <div class="empty-state">
          <p>No workouts yet. <a href="/fitness/workout">Start your first workout!</a></p>
        </div>
      {:else}
        <div class="sessions-list">
          {#each recentSessions as session}
            <div class="session-card">
              <div class="session-info">
                <h3>{session.name}</h3>
                <p class="session-date">{formatDate(session.startTime)}</p>
              </div>
              <div class="session-stats">
                <span class="duration">{formatDuration(session.duration)}</span>
                <span class="exercises">{session.exercises.length} exercises</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Workout Templates</h2>
        <a href="/fitness/templates" class="view-all">View All</a>
      </div>
      
      {#if templates.length === 0}
        <div class="empty-state">
          <p>No templates yet.</p>
          <div class="empty-actions">
            <a href="/fitness/templates">Create your first template!</a>
            <button class="example-btn" onclick={createExampleTemplate}>
              Create Example Template
            </button>
          </div>
        </div>
      {:else}
        <div class="templates-list">
          {#each templates as template}
            <div class="template-card">
              <h3>{template.name}</h3>
              {#if template.description}
                <p class="template-description">{template.description}</p>
              {/if}
              <div class="template-stats">
                <span>{template.exercises.length} exercises</span>
              </div>
              <div class="template-actions">
                <a href="/fitness/workout?template={template._id}" class="start-btn">Start Workout</a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .dashboard-header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .dashboard-header p {
    color: #6b7280;
    font-size: 1.1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    font-size: 2.5rem;
    opacity: 0.8;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .section {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .section-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .view-all {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .view-all:hover {
    text-decoration: underline;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-state a {
    color: #3b82f6;
    text-decoration: none;
  }

  .empty-state a:hover {
    text-decoration: underline;
  }

  .empty-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .example-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .example-btn:hover {
    background: #059669;
  }

  .sessions-list, .templates-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .session-card {
    display: flex;
    justify-content: between;
    align-items: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .session-info h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .session-date {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  .session-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .template-card {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .template-card h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .template-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 0.5rem 0;
  }

  .template-stats {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .template-actions {
    display: flex;
    justify-content: end;
  }

  .start-btn {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .start-btn:hover {
    background: #2563eb;
  }

  @media (max-width: 768px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
    
    .session-card {
      flex-direction: column;
      align-items: start;
      gap: 0.5rem;
    }
    
    .session-stats {
      gap: 0.5rem;
    }
  }
</style>