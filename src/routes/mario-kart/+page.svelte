<script>
  import { goto } from '$app/navigation';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  let tournaments = $state(data.tournaments);
  let showCreateModal = $state(false);
  let newTournamentName = $state('');
  let roundsPerMatch = $state(3);
  let matchSize = $state(2);
  let loading = $state(false);

  async function createTournament() {
    if (!newTournamentName.trim()) {
      alert('Please enter a tournament name');
      return;
    }

    loading = true;
    try {
      const response = await fetch('/api/mario-kart/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTournamentName,
          roundsPerMatch,
          matchSize
        })
      });

      if (response.ok) {
        const data = await response.json();
        showCreateModal = false;
        newTournamentName = '';
        goto(`/mario-kart/${data.tournament._id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Failed to create tournament:', error);
      alert('Failed to create tournament');
    } finally {
      loading = false;
    }
  }

  async function deleteTournament(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mario-kart/tournaments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete tournament');
      }
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      alert('Failed to delete tournament');
    }
  }

  function getStatusBadge(status) {
    const badges = {
      setup: { text: 'Setup', class: 'badge-blue' },
      group_stage: { text: 'Group Stage', class: 'badge-yellow' },
      bracket: { text: 'Bracket', class: 'badge-purple' },
      completed: { text: 'Completed', class: 'badge-green' }
    };
    return badges[status] || badges.setup;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="container">
  <div class="header">
    <div class="header-content">
      <h1>Mario Kart Tournament Tracker</h1>
      <p>Manage your company Mario Kart tournaments</p>
    </div>
    <button class="btn-primary" onclick={() => showCreateModal = true}>
      Create Tournament
    </button>
  </div>

  {#if tournaments.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🏁</div>
      <h2>No tournaments yet</h2>
      <p>Create your first Mario Kart tournament to get started!</p>
      <button class="btn-primary" onclick={() => showCreateModal = true}>
        Create Your First Tournament
      </button>
    </div>
  {:else}
    <div class="tournaments-grid">
      {#each tournaments as tournament}
        <div class="tournament-card">
          <div class="card-header">
            <h3>{tournament.name}</h3>
            <span class="badge {getStatusBadge(tournament.status).class}">
              {getStatusBadge(tournament.status).text}
            </span>
          </div>

          <div class="card-stats">
            <div class="stat">
              <span class="stat-icon">👥</span>
              <span>{tournament.contestants.length} contestants</span>
            </div>
            {#if tournament.groups.length > 0}
              <div class="stat">
                <span class="stat-icon">🎮</span>
                <span>{tournament.groups.length} groups</span>
              </div>
            {/if}
            <div class="stat">
              <span class="stat-icon">🔄</span>
              <span>{tournament.roundsPerMatch} rounds/match</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="date">Created {formatDate(tournament.createdAt)}</span>
            <div class="actions">
              <a href="/mario-kart/{tournament._id}" class="btn-view">View</a>
              <button
                class="btn-delete"
                onclick={() => deleteTournament(tournament._id, tournament.name)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showCreateModal}
  <div class="modal-overlay" onclick={() => showCreateModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Create New Tournament</h2>
        <button class="close-btn" onclick={() => showCreateModal = false}>×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="tournament-name">Tournament Name</label>
          <input
            id="tournament-name"
            type="text"
            bind:value={newTournamentName}
            placeholder="e.g., Company Championship 2024"
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="rounds-per-match">Rounds per Match</label>
          <input
            id="rounds-per-match"
            type="number"
            bind:value={roundsPerMatch}
            min="1"
            max="10"
            class="input"
          />
          <small>How many races should each match have?</small>
        </div>

        <div class="form-group">
          <label for="match-size">Match Size (Contestants per Match)</label>
          <input
            id="match-size"
            type="number"
            bind:value={matchSize}
            min="2"
            max="12"
            class="input"
          />
          <small>How many contestants compete simultaneously? (2 for 1v1, 4 for 4-player matches)</small>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => showCreateModal = false}>
          Cancel
        </button>
        <button
          class="btn-primary"
          onclick={createTournament}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-content h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .header-content p {
    color: #6b7280;
    margin: 0;
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
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .tournaments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .tournament-card {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .tournament-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .card-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
    flex: 1;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge-blue {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-yellow {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-purple {
    background: #e9d5ff;
    color: #6b21a8;
  }

  .badge-green {
    background: #d1fae5;
    color: #065f46;
  }

  .card-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #4b5563;
  }

  .stat-icon {
    font-size: 1.25rem;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .date {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  .btn-view {
    background: #10b981;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-view:hover {
    background: #059669;
  }

  .btn-delete {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-delete:hover {
    background: #dc2626;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }

  .modal {
    background: white;
    border-radius: 1rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #9ca3af;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
  }

  .close-btn:hover {
    color: #4b5563;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .input {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    ring: 2px;
    ring-color: rgba(59, 130, 246, 0.5);
  }

  .form-group small {
    display: block;
    color: #6b7280;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .tournaments-grid {
      grid-template-columns: 1fr;
    }

    .card-footer {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .actions {
      justify-content: stretch;
    }

    .btn-view,
    .btn-delete {
      flex: 1;
      text-align: center;
    }
  }
</style>
