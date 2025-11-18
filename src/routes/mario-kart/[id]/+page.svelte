<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let { data } = $props();

  let tournament = $state(data.tournament);
  let showConfetti = $state(false);
  let confettiPieces = $state([]);

  // Contestant management
  let newContestantName = $state('');
  let addingContestant = $state(false);

  // Group management
  let groupCreationMethod = $state('numGroups'); // 'numGroups' or 'maxPerGroup'
  let numberOfGroups = $state(2);
  let maxUsersPerGroup = $state(4);
  let creatingGroups = $state(false);

  // Score tracking
  let activeScoreEntry = $state(null); // { groupId, matchId, roundNumber }
  let scoreInputs = $state({});

  // Mid-tournament contestant management
  let showManageContestantsModal = $state(false);
  let newMidTournamentContestantName = $state('');
  let addingMidTournamentContestant = $state(false);

  // Bracket management
  let topNFromEachGroup = $state(2);

  const tournamentId = $derived(tournament._id);

  $effect(() => {
    if (tournament?.status === 'completed' && !showConfetti) {
      triggerConfetti();
    }
  });

  function triggerConfetti() {
    showConfetti = true;
    confettiPieces = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'][Math.floor(Math.random() * 6)]
    }));

    setTimeout(() => {
      showConfetti = false;
    }, 5000);
  }

  async function addContestant() {
    if (!newContestantName.trim()) {
      alert('Please enter a contestant name');
      return;
    }

    addingContestant = true;
    try {
      const response = await fetch(`/api/mario-kart/tournaments/${tournamentId}/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newContestantName })
      });

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
        newContestantName = '';
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add contestant');
      }
    } catch (err) {
      console.error('Failed to add contestant:', err);
      alert('Failed to add contestant');
    } finally {
      addingContestant = false;
    }
  }

  async function removeContestant(contestantId) {
    if (!confirm('Remove this contestant?')) return;

    try {
      const response = await fetch(
        `/api/mario-kart/tournaments/${tournamentId}/contestants?contestantId=${contestantId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove contestant');
      }
    } catch (err) {
      console.error('Failed to remove contestant:', err);
      alert('Failed to remove contestant');
    }
  }

  async function addMidTournamentContestant() {
    if (!newMidTournamentContestantName.trim()) {
      alert('Please enter a contestant name');
      return;
    }

    addingMidTournamentContestant = true;
    try {
      const response = await fetch(`/api/mario-kart/tournaments/${tournamentId}/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMidTournamentContestantName })
      });

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
        newMidTournamentContestantName = '';
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add contestant');
      }
    } catch (err) {
      console.error('Failed to add contestant:', err);
      alert('Failed to add contestant');
    } finally {
      addingMidTournamentContestant = false;
    }
  }

  async function toggleDNF(contestantId, currentDNF) {
    const action = currentDNF ? 'reactivate' : 'mark as DNF';
    if (!confirm(`Are you sure you want to ${action} this contestant?`)) return;

    try {
      const response = await fetch(`/api/mario-kart/tournaments/${tournamentId}/contestants/${contestantId}/dnf`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dnf: !currentDNF })
      });

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update contestant status');
      }
    } catch (err) {
      console.error('Failed to update contestant status:', err);
      alert('Failed to update contestant status');
    }
  }

  async function createGroups() {
    if (tournament.contestants.length < 2) {
      alert('Need at least 2 contestants to create groups');
      return;
    }

    creatingGroups = true;
    try {
      const requestBody = groupCreationMethod === 'numGroups'
        ? { numberOfGroups }
        : { maxUsersPerGroup };

      const response = await fetch(`/api/mario-kart/tournaments/${tournamentId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create groups');
      }
    } catch (err) {
      console.error('Failed to create groups:', err);
      alert('Failed to create groups');
    } finally {
      creatingGroups = false;
    }
  }

  function openScoreEntry(groupId, matchId, roundNumber) {
    try {
      console.log('Opening score entry', { groupId, matchId, roundNumber });
      console.log('Tournament groups:', tournament.groups);

      const group = tournament.groups.find(g => g._id === groupId);
      if (!group) {
        console.error('Group not found:', groupId);
        alert('Error: Group not found');
        return;
      }

      const match = group.matches.find(m => m._id === matchId);
      if (!match) {
        console.error('Match not found:', matchId);
        alert('Error: Match not found');
        return;
      }

      // Initialize score inputs for each contestant
      const inputs = {};
      for (const contestantId of match.contestantIds) {
        // Find existing score for this round
        const existingRound = match.rounds.find(r => r.roundNumber === roundNumber);
        inputs[contestantId] = existingRound?.scores?.[contestantId] || 0;
      }

      console.log('Score inputs:', inputs);
      scoreInputs = inputs;
      activeScoreEntry = { groupId, matchId, roundNumber };
    } catch (err) {
      console.error('Error opening score entry:', err);
      alert('Error opening score entry: ' + err.message);
    }
  }

  async function submitGroupScores() {
    const { groupId, matchId, roundNumber } = activeScoreEntry;

    try {
      const response = await fetch(
        `/api/mario-kart/tournaments/${tournamentId}/groups/${groupId}/scores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            roundNumber,
            scores: scoreInputs
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
        activeScoreEntry = null;
        scoreInputs = {};
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit scores');
      }
    } catch (err) {
      console.error('Failed to submit scores:', err);
      alert('Failed to submit scores');
    }
  }

  async function generateBracket() {
    if (!confirm(`Generate bracket with top ${topNFromEachGroup} from each group?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mario-kart/tournaments/${tournamentId}/bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topNFromEachGroup })
      });

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate bracket');
      }
    } catch (err) {
      console.error('Failed to generate bracket:', err);
      alert('Failed to generate bracket');
    }
  }

  function openBracketScoreEntry(matchId, roundNumber) {
    const match = findBracketMatch(matchId);
    if (!match) return;

    const inputs = {};
    const existingRound = match.rounds.find(r => r.roundNumber === roundNumber);

    // Handle both old format (contestant1Id/contestant2Id) and new format (contestantIds array)
    const contestantIds = match.contestantIds || [];
    for (const contestantId of contestantIds) {
      if (contestantId) {
        inputs[contestantId] = existingRound?.scores?.[contestantId] || 0;
      }
    }

    scoreInputs = inputs;
    activeScoreEntry = { bracketMatchId: matchId, roundNumber };
  }

  async function submitBracketScores() {
    const { bracketMatchId, roundNumber } = activeScoreEntry;

    try {
      const response = await fetch(
        `/api/mario-kart/tournaments/${tournamentId}/bracket/matches/${bracketMatchId}/scores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundNumber,
            scores: scoreInputs
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        tournament = data.tournament;
        activeScoreEntry = null;
        scoreInputs = {};
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit scores');
      }
    } catch (err) {
      console.error('Failed to submit scores:', err);
      alert('Failed to submit scores');
    }
  }

  function findBracketMatch(matchId) {
    if (!tournament?.bracket) return null;

    // Check main bracket first
    for (const round of tournament.bracket.rounds) {
      const match = round.matches.find(m => m._id === matchId);
      if (match) return match;
    }

    // Check runners-up bracket
    if (tournament.runnersUpBracket) {
      for (const round of tournament.runnersUpBracket.rounds) {
        const match = round.matches.find(m => m._id === matchId);
        if (match) return match;
      }
    }

    return null;
  }

  function getContestantName(contestantId) {
    const contestant = tournament.contestants.find(c => c._id === contestantId);
    return contestant?.name || 'TBD';
  }

  function getTotalScore(match, contestantId) {
    return match.rounds.reduce((sum, round) => {
      return sum + (round.scores?.[contestantId] || 0);
    }, 0);
  }

  function getWinnerName() {
    if (!tournament?.bracket) return null;
    const finals = tournament.bracket.rounds[0];
    if (finals.matches.length > 0 && finals.matches[0].winnerId) {
      return getContestantName(finals.matches[0].winnerId);
    }
    return null;
  }

  // Generate preview bracket structure during group stage
  function generatePreviewBracket() {
    if (!tournament || tournament.status !== 'group_stage' || tournament.groups.length === 0) {
      return null;
    }

    // Collect top contestants from each group based on current standings
    const qualifiedContestants = [];
    for (const group of tournament.groups) {
      if (!group.standings || group.standings.length === 0) continue;

      const topContestants = [...group.standings]
        .sort((a, b) => a.position - b.position)
        .slice(0, topNFromEachGroup)
        .map(s => s.contestantId);

      qualifiedContestants.push(...topContestants);
    }

    const matchSize = tournament.matchSize || 2;

    if (qualifiedContestants.length < matchSize) return null;

    // Generate bracket structure (same logic as backend)
    const bracketSize = Math.pow(matchSize, Math.ceil(Math.log(qualifiedContestants.length) / Math.log(matchSize)));
    const rounds = [];
    let currentContestants = bracketSize;
    let roundNumber = Math.ceil(Math.log(bracketSize) / Math.log(matchSize));

    while (currentContestants >= matchSize) {
      const roundName = roundNumber === 1 ? 'Finals' :
        roundNumber === 2 ? 'Semi-Finals' :
          roundNumber === 3 ? 'Quarter-Finals' :
            roundNumber === 4 ? 'Round of 16' :
              roundNumber === 5 ? 'Round of 32' :
                `Round ${roundNumber}`;

      rounds.push({
        roundNumber,
        name: roundName,
        matches: []
      });

      currentContestants = currentContestants / matchSize;
      roundNumber--;
    }

    // Populate each round with the correct number of matches
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i];
      const matchesInRound = Math.pow(matchSize, round.roundNumber - 1);

      for (let j = 0; j < matchesInRound; j++) {
        // Only populate contestants for the first round (largest roundNumber)
        if (i === rounds.length - 1) {
          const contestantIds = [];
          for (let k = 0; k < matchSize; k++) {
            const contestantIndex = j * matchSize + k;
            if (contestantIndex < qualifiedContestants.length) {
              contestantIds.push(qualifiedContestants[contestantIndex]);
            }
          }

          round.matches.push({
            _id: `preview-${i}-${j}`,
            contestantIds,
            rounds: [],
            completed: false
          });
        } else {
          round.matches.push({
            _id: `preview-${i}-${j}`,
            contestantIds: [],
            rounds: [],
            completed: false
          });
        }
      }
    }

    return { rounds };
  }

  const winnerName = $derived(getWinnerName());
  const previewBracket = $derived(generatePreviewBracket());
</script>

<div class="container">
    <div class="header">
      <div>
        <div class="breadcrumb">
          <a href="/mario-kart">Tournaments</a>
          <span>/</span>
          <span>{tournament.name}</span>
        </div>
        <h1>{tournament.name}</h1>
      </div>
      <div class="status-badge {tournament.status}">
        {tournament.status.replace('_', ' ').toUpperCase()}
      </div>
    </div>


    <!-- SETUP PHASE: Contestant Management -->
    {#if tournament.status === 'setup'}
      <div class="section">
        <div class="section-header">
          <h2>Contestants</h2>
          <span class="count">{tournament.contestants.length} total</span>
        </div>

        <div class="add-contestant-form">
          <input
            type="text"
            bind:value={newContestantName}
            placeholder="Enter contestant name"
            class="input"
            onkeydown={(e) => e.key === 'Enter' && addContestant()}
          />
          <button
            class="btn-primary"
            onclick={addContestant}
            disabled={addingContestant}
          >
            {addingContestant ? 'Adding...' : 'Add Contestant'}
          </button>
        </div>

        {#if tournament.contestants.length > 0}
          <div class="contestants-list">
            {#each tournament.contestants as contestant}
              <div class="contestant-item">
                <span class="contestant-name">{contestant.name}</span>
                <button
                  class="btn-remove"
                  onclick={() => removeContestant(contestant._id)}
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>

          <div class="setup-actions">
            <div class="group-config">
              <div class="form-group">
                <label>Group Creation Method</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input
                      type="radio"
                      bind:group={groupCreationMethod}
                      value="numGroups"
                    />
                    <span>Fixed number of groups</span>
                  </label>
                  <label class="radio-label">
                    <input
                      type="radio"
                      bind:group={groupCreationMethod}
                      value="maxPerGroup"
                    />
                    <span>Max contestants per group</span>
                  </label>
                </div>
              </div>

              {#if groupCreationMethod === 'numGroups'}
                <div class="form-group">
                  <label for="num-groups">Number of Groups</label>
                  <input
                    id="num-groups"
                    type="number"
                    bind:value={numberOfGroups}
                    min="1"
                    max={Math.floor(tournament.contestants.length / 2)}
                    class="input-small"
                  />
                </div>
              {:else}
                <div class="form-group">
                  <label for="max-per-group">Max Contestants Per Group</label>
                  <input
                    id="max-per-group"
                    type="number"
                    bind:value={maxUsersPerGroup}
                    min="2"
                    max={tournament.contestants.length}
                    class="input-small"
                  />
                </div>
              {/if}
            </div>

            <button
              class="btn-success"
              onclick={createGroups}
              disabled={creatingGroups || tournament.contestants.length < 2}
            >
              {creatingGroups ? 'Creating...' : 'Create Groups & Start Tournament'}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- GROUP STAGE -->
    {#if tournament.status === 'group_stage'}
      <div class="section">
        <div class="section-header">
          <h2>Group Stage</h2>
          <div class="header-actions">
            <button class="btn-secondary" onclick={() => showManageContestantsModal = true}>
              Manage Contestants
            </button>
            <button class="btn-primary" onclick={generateBracket}>
              Generate Bracket
            </button>
          </div>
        </div>

        <div class="bracket-config">
          <label for="top-n">Top contestants per group:</label>
          <input
            id="top-n"
            type="number"
            bind:value={topNFromEachGroup}
            min="1"
            max="10"
            class="input-small"
          />
        </div>

        <!-- Preview Bracket Tree -->
        {#if previewBracket}
          <div class="preview-bracket-section">
            <div class="preview-header">
              <h3>🔮 Bracket Preview</h3>
              <p class="preview-subtitle">Based on current standings (Top {topNFromEachGroup} from each group)</p>
            </div>

            <div class="bracket-pyramid preview-pyramid">
              {#each previewBracket.rounds as round, roundIndex}
                <div class="pyramid-round">
                  <h3 class="pyramid-round-title">{round.name}</h3>
                  <div class="pyramid-matches">
                    {#each round.matches as match, matchIndex}
                      {@const contestantIds = match.contestantIds || []}
                      <div class="pyramid-match preview-match">
                        <div class="pyramid-match-content">
                          {#if contestantIds.length === 0}
                            <div class="tree-contestant tbd">
                              <span class="tree-contestant-name">TBD</span>
                            </div>
                          {:else}
                            {#each contestantIds as contestantId, idx}
                              <div class="tree-contestant">
                                <span class="tree-contestant-name">
                                  {getContestantName(contestantId)}
                                </span>
                              </div>
                              {#if idx < contestantIds.length - 1}
                                <div class="tree-vs">vs</div>
                              {/if}
                            {/each}
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#each tournament.groups as group}
          <div class="group-card">
            <h3>{group.name}</h3>

            <div class="group-contestants">
              <strong>Contestants:</strong>
              {#each group.contestantIds as contestantId, i}
                <span>
                  {getContestantName(contestantId)}{i < group.contestantIds.length - 1 ? ', ' : ''}
                </span>
              {/each}
            </div>

            {#each group.matches as match}
              <div class="match-card">
                <div class="match-header">
                  <strong>Match</strong>
                  <span class="match-status {match.completed ? 'completed' : 'pending'}">
                    {match.completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div class="rounds-grid">
                  {#each Array(tournament.roundsPerMatch) as _, roundIndex}
                    {@const roundNumber = roundIndex + 1}
                    {@const existingRound = match.rounds.find(r => r.roundNumber === roundNumber)}
                    <div class="round-card">
                      <div class="round-header">Round {roundNumber}</div>
                      {#if existingRound}
                        <div class="scores-display">
                          {#each match.contestantIds as contestantId}
                            <div class="score-item">
                              <span>{getContestantName(contestantId)}</span>
                              <span class="score">{existingRound.scores[contestantId] || 0} pts</span>
                            </div>
                          {/each}
                        </div>
                      {:else}
                        <button
                          class="btn-score"
                          onclick={() => openScoreEntry(group._id, match._id, roundNumber)}
                        >
                          Enter Scores
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>

                {#if match.rounds.length > 0}
                  <div class="total-scores">
                    <strong>Total Scores:</strong>
                    {#each match.contestantIds as contestantId}
                      <div class="total-score-item">
                        <span>{getContestantName(contestantId)}</span>
                        <span class="score">{getTotalScore(match, contestantId)} pts</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}

            {#if group.standings && group.standings.length > 0}
              <div class="standings">
                <h4>Standings</h4>
                <table class="standings-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Contestant</th>
                      <th>Total Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each group.standings as standing}
                      <tr>
                        <td class="position">{standing.position}</td>
                        <td>{getContestantName(standing.contestantId)}</td>
                        <td class="score">{standing.totalScore}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- BRACKET PHASE -->
    {#if tournament.status === 'bracket' || tournament.status === 'completed'}
      <div class="section">
        <div class="section-header">
          <h2>🏆 Championship Bracket</h2>
          {#if tournament.status === 'completed' && winnerName}
            <span class="winner-badge">🏆 Champion: {winnerName}</span>
          {/if}
        </div>

        <div class="bracket-pyramid">
          {#each [...tournament.bracket.rounds].reverse() as round, roundIndex}
            {@const visibleMatches = round.matches.filter(m => (m.contestantIds && m.contestantIds.length > 0) || roundIndex === 0)}
            {#if visibleMatches.length > 0}
              <div class="pyramid-round">
                <h3 class="pyramid-round-title">{round.name}</h3>
                <div class="pyramid-matches">
                  {#each visibleMatches as match, matchIndex}
                    {@const contestantIds = match.contestantIds || []}
                    <div class="pyramid-match {match.completed ? 'match-completed' : ''}">
                    <div class="pyramid-match-content">
                      {#if contestantIds.length === 0}
                        <div class="tree-contestant tbd">
                          <span class="tree-contestant-name">TBD</span>
                        </div>
                      {:else}
                        {#each contestantIds as contestantId, idx}
                          <div class="tree-contestant {match.winnerId === contestantId ? 'tree-winner' : ''}">
                            <span class="tree-contestant-name">
                              {getContestantName(contestantId)}
                            </span>
                            {#if match.rounds.length > 0}
                              <span class="tree-score">{getTotalScore(match, contestantId)}</span>
                            {/if}
                          </div>
                          {#if idx < contestantIds.length - 1}
                            <div class="tree-vs">vs</div>
                          {/if}
                        {/each}
                      {/if}

                      {#if contestantIds.length >= (tournament.matchSize || 2) && !match.completed}
                        <div class="tree-actions">
                          {#each Array(tournament.roundsPerMatch) as _, roundIdx}
                            {@const roundNumber = roundIdx + 1}
                            {@const existingRound = match.rounds.find(r => r.roundNumber === roundNumber)}
                            {#if existingRound}
                              <span class="round-done-small">R{roundNumber} ✓</span>
                            {:else}
                              <button
                                class="btn-round"
                                onclick={() => openBracketScoreEntry(match._id, roundNumber)}
                              >
                                R{roundNumber}
                              </button>
                            {/if}
                          {/each}
                        </div>
                      {/if}

                      {#if match.winnerId}
                        <div class="tree-winner-badge">
                          🏆 {getContestantName(match.winnerId)}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Runners-Up Bracket -->
      {#if tournament.runnersUpBracket}
        <div class="section runners-up-section">
          <div class="section-header">
            <h2>🥉 Runners-Up Bracket (Consolation)</h2>
          </div>

          <div class="bracket-pyramid">
            {#each tournament.runnersUpBracket.rounds as round, roundIndex}
              <div class="pyramid-round">
                <h3 class="pyramid-round-title">{round.name}</h3>
                <div class="pyramid-matches">
                  {#each round.matches as match, matchIndex}
                    {@const contestantIds = match.contestantIds || []}
                    <div class="pyramid-match {match.completed ? 'match-completed' : ''}">
                      <div class="pyramid-match-content runners-up-match">
                        {#if contestantIds.length === 0}
                          <div class="tree-contestant tbd">
                            <span class="tree-contestant-name">TBD</span>
                          </div>
                        {:else}
                          {#each contestantIds as contestantId, idx}
                            <div class="tree-contestant {match.winnerId === contestantId ? 'tree-winner' : ''}">
                              <span class="tree-contestant-name">
                                {getContestantName(contestantId)}
                              </span>
                              {#if match.rounds.length > 0}
                                <span class="tree-score">{getTotalScore(match, contestantId)}</span>
                              {/if}
                            </div>
                            {#if idx < contestantIds.length - 1}
                              <div class="tree-vs">vs</div>
                            {/if}
                          {/each}
                        {/if}

                        {#if contestantIds.length >= (tournament.matchSize || 2) && !match.completed}
                          <div class="tree-actions">
                            {#each Array(tournament.roundsPerMatch) as _, roundIdx}
                              {@const roundNumber = roundIdx + 1}
                              {@const existingRound = match.rounds.find(r => r.roundNumber === roundNumber)}
                              {#if existingRound}
                                <span class="round-done-small">R{roundNumber} ✓</span>
                              {:else}
                                <button
                                  class="btn-round btn-round-runners"
                                  onclick={() => openBracketScoreEntry(match._id, roundNumber)}
                                >
                                  R{roundNumber}
                                </button>
                              {/if}
                            {/each}
                          </div>
                        {/if}

                        {#if match.winnerId}
                          <div class="tree-winner-badge runners-up-winner">
                            🥉 {getContestantName(match.winnerId)}
                          </div>
                        {/if}
                      </div>
                    </div>
                    {/each}
                  </div>
                </div>
            {/each}
          </div>
            </div>
    {/if}
    {/if}
            </div>


<!-- Score Entry Modal -->
{#if activeScoreEntry}
  <div class="modal-overlay" onclick={() => activeScoreEntry = null}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Enter Scores - Round {activeScoreEntry.roundNumber}</h2>
        <button class="close-btn" onclick={() => activeScoreEntry = null}>×</button>
      </div>

      <div class="modal-body">
        {#each Object.keys(scoreInputs) as contestantId}
          <div class="score-input-group">
            <label>{getContestantName(contestantId)}</label>
            <input
              type="number"
              bind:value={scoreInputs[contestantId]}
              min="0"
              class="input"
            />
          </div>
        {/each}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={() => activeScoreEntry = null}>
          Cancel
        </button>
        <button
          class="btn-primary"
          onclick={activeScoreEntry.bracketMatchId ? submitBracketScores : submitGroupScores}
        >
          Submit Scores
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Manage Contestants Modal -->
{#if showManageContestantsModal}
  <div class="modal-overlay" onclick={() => showManageContestantsModal = false}>
    <div class="modal modal-large" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Manage Contestants</h2>
        <button class="close-btn" onclick={() => showManageContestantsModal = false}>×</button>
      </div>

      <div class="modal-body">
        <div class="manage-section">
          <h3>Add New Contestant</h3>
          <div class="add-contestant-form">
            <input
              type="text"
              bind:value={newMidTournamentContestantName}
              placeholder="Enter contestant name"
              class="input"
              onkeydown={(e) => e.key === 'Enter' && addMidTournamentContestant()}
            />
            <button
              class="btn-primary"
              onclick={addMidTournamentContestant}
              disabled={addingMidTournamentContestant}
            >
              {addingMidTournamentContestant ? 'Adding...' : 'Add Contestant'}
            </button>
          </div>
        </div>

        <div class="manage-section">
          <h3>All Contestants</h3>
          <div class="contestants-manage-list">
            {#each tournament.contestants as contestant}
              <div class="contestant-manage-item {contestant.dnf ? 'dnf' : ''}">
                <div class="contestant-info">
                  <span class="contestant-name">{contestant.name}</span>
                  {#if contestant.dnf}
                    <span class="dnf-badge">DNF</span>
                  {/if}
                </div>
                <button
                  class="btn-dnf {contestant.dnf ? 'btn-reactivate' : ''}"
                  onclick={() => toggleDNF(contestant._id, contestant.dnf)}
                >
                  {contestant.dnf ? 'Reactivate' : 'Mark DNF'}
                </button>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" onclick={() => showManageContestantsModal = false}>
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Confetti Animation -->
{#if showConfetti}
  <div class="confetti-container">
    {#each confettiPieces as piece (piece.id)}
      <div
        class="confetti"
        style="left: {piece.left}%; animation-delay: {piece.delay}s; animation-duration: {piece.duration}s; background-color: {piece.color};"
      ></div>
    {/each}
  </div>
{/if}

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .loading,
  .error-container {
    text-align: center;
    padding: 4rem 2rem;
  }

  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .breadcrumb a {
    color: #3b82f6;
    text-decoration: none;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #1f2937;
    margin: 0;
  }

  .status-badge {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-badge.setup {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-badge.group_stage {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.bracket {
    background: #e9d5ff;
    color: #6b21a8;
  }

  .status-badge.completed {
    background: #d1fae5;
    color: #065f46;
  }

  .section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .count {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .add-contestant-form {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .input {
    flex: 1;
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .input-small {
    width: 100px;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
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
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  .btn-success {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-success:hover:not(:disabled) {
    background: #059669;
  }

  .btn-success:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .contestants-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .contestant-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .contestant-name {
    font-weight: 500;
    color: #1f2937;
  }

  .btn-remove {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-remove:hover {
    background: #dc2626;
  }

  .setup-actions {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .group-config {
    display: flex;
    gap: 2rem;
    align-items: end;
    flex: 1;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: #4b5563;
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  .radio-label span {
    font-weight: 400;
  }

  .bracket-config {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .bracket-config label {
    font-weight: 500;
    color: #374151;
  }

  .group-card {
    background: #f9fafb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .group-card h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .group-contestants {
    color: #4b5563;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
  }

  .match-card {
    background: white;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .match-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .match-status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .match-status.completed {
    background: #d1fae5;
    color: #065f46;
  }

  .match-status.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .rounds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .round-card {
    background: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .round-header {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.75rem;
  }

  .scores-display {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .score-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .score {
    font-weight: 600;
    color: #3b82f6;
  }

  .btn-score {
    width: 100%;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-score:hover {
    background: #2563eb;
  }

  .total-scores {
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .total-score-item {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-weight: 500;
  }

  .standings {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #d1d5db;
  }

  .standings h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .standings-table {
    width: 100%;
    border-collapse: collapse;
  }

  .standings-table th {
    text-align: left;
    padding: 0.75rem;
    background: white;
    color: #6b7280;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .standings-table td {
    padding: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }

  .standings-table .position {
    font-weight: 700;
    color: #1f2937;
    width: 50px;
  }

  .bracket-container {
    display: flex;
    gap: 2rem;
    overflow-x: auto;
    padding: 1rem 0;
  }

  .bracket-round {
    min-width: 300px;
  }

  .bracket-round-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .bracket-matches {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .bracket-match {
    background: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 2px solid #e5e7eb;
  }

  .bracket-match.completed {
    border-color: #10b981;
  }

  .bracket-contestant {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .bracket-contestant.winner {
    background: #d1fae5;
    border: 2px solid #10b981;
    font-weight: 600;
  }

  .contestant-name-bracket {
    flex: 1;
  }

  .bracket-score {
    font-weight: 700;
    color: #3b82f6;
    margin-left: 1rem;
  }

  .vs {
    text-align: center;
    color: #9ca3af;
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0.25rem 0;
  }

  .bracket-rounds {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-score-small {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .btn-score-small:hover {
    background: #2563eb;
  }

  .round-done {
    color: #10b981;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .match-winner {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: #d1fae5;
    border-radius: 0.375rem;
    text-align: center;
    font-weight: 600;
    color: #065f46;
  }

  .winner-badge {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
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

  .modal-large {
    max-width: 700px;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    font-size: 1.25rem;
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

  .score-input-group {
    margin-bottom: 1rem;
  }

  .score-input-group:last-child {
    margin-bottom: 0;
  }

  .score-input-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
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
      align-items: start;
      gap: 1rem;
    }

    .add-contestant-form {
      flex-direction: column;
    }

    .setup-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .contestants-list {
      grid-template-columns: 1fr;
    }

    .rounds-grid {
      grid-template-columns: 1fr;
    }

    .bracket-container {
      flex-direction: column;
    }

    .podium {
      flex-direction: column;
      align-items: center;
    }

    .podium-place {
      width: 100%;
    }

    .pyramid-match {
      min-width: 100%;
      max-width: 100%;
    }

    .pyramid-matches {
      flex-direction: column;
    }
  }

  /* Podium Styles */
  .podium-section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    margin-bottom: 2rem;
  }

  .podium-section h2 {
    text-align: center;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 2rem 0;
  }

  .podium {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .podium-place {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .podium-place.first {
    order: 2;
  }

  .podium-place.second {
    order: 1;
  }

  .podium-place.third {
    order: 3;
  }

  .podium-trophy {
    font-size: 3rem;
    animation: bounce 2s infinite;
  }

  .podium-name {
    font-weight: 600;
    font-size: 1.125rem;
    color: #1f2937;
    text-align: center;
  }

  .podium-score {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .podium-bar {
    width: 120px;
    border-radius: 0.5rem 0.5rem 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .first-bar {
    height: 180px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  }

  .second-bar {
    height: 140px;
    background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
  }

  .third-bar {
    height: 100px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  }

  .podium-rank {
    color: white;
    font-weight: 700;
    font-size: 1.5rem;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .other-standings {
    margin-top: 2rem;
  }

  .other-standings h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .standings-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .standing-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .standing-rank {
    font-weight: 700;
    color: #1f2937;
    width: 40px;
  }

  .standing-name {
    flex: 1;
    font-weight: 500;
    color: #4b5563;
  }

  .standing-score {
    font-weight: 600;
    color: #3b82f6;
  }

  /* Pyramid Bracket Styles */
  .bracket-pyramid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3rem;
    padding: 2rem 0;
    min-height: 400px;
  }

  .pyramid-round {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .pyramid-round-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    text-align: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .pyramid-matches {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.5rem;
    width: 100%;
    max-width: 1200px;
  }

  .pyramid-match {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 1 auto;
    min-width: 280px;
    max-width: 350px;
  }

  .pyramid-match-content {
    background: white;
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: 0 2px 4px 0 rgb(0 0 0 / 0.1);
    border: 2px solid #e5e7eb;
    width: 100%;
    transition: all 0.2s;
  }

  .pyramid-match.match-completed .pyramid-match-content {
    border-color: #10b981;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .tree-contestant {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .tree-contestant.tbd {
    opacity: 0.5;
  }

  .tree-contestant.tree-winner {
    background: #d1fae5;
    border-color: #10b981;
    font-weight: 600;
  }

  .tree-contestant-name {
    flex: 1;
    font-size: 0.875rem;
    color: #1f2937;
  }

  .tree-score {
    font-weight: 700;
    color: #3b82f6;
    font-size: 1rem;
    margin-left: 0.5rem;
  }

  .tree-vs {
    text-align: center;
    color: #9ca3af;
    font-weight: 600;
    font-size: 0.75rem;
    margin: 0.25rem 0;
  }

  .tree-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-round {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-round:hover {
    background: #2563eb;
  }

  .round-done-small {
    color: #10b981;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tree-winner-badge {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 700;
    color: white;
    font-size: 0.875rem;
  }

  /* Confetti Animation */
  .confetti-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
  }

  .confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    top: -10px;
    animation: confetti-fall linear forwards;
  }

  @keyframes confetti-fall {
    to {
      transform: translateY(100vh) rotate(720deg);
    }
  }

  /* Runners-Up Bracket Styles */
  .runners-up-section {
    background: linear-gradient(to bottom, #fff7ed, white);
    border: 2px solid #f97316;
  }

  .runners-up-section .pyramid-round-title {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  }

  .runners-up-match {
    border-color: #f97316;
  }

  .btn-round-runners {
    background: #f97316;
  }

  .btn-round-runners:hover {
    background: #ea580c;
  }

  .runners-up-winner {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  }

  /* Preview Bracket Styles */
  .preview-bracket-section {
    margin: 2rem 0;
    padding: 1.5rem;
    background: linear-gradient(to bottom, #eff6ff, #dbeafe);
    border-radius: 0.75rem;
    border: 2px dashed #3b82f6;
  }

  .preview-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .preview-header h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e40af;
    margin: 0 0 0.5rem 0;
  }

  .preview-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    font-style: italic;
  }

  .preview-match .pyramid-match-content {
    background: white;
    border: 2px dashed #93c5fd;
    opacity: 0.9;
  }

  .preview-match .tree-contestant {
    background: #eff6ff;
  }

  .preview-pyramid .pyramid-round-title {
    background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%);
  }

  /* Manage Contestants Modal */
  .manage-section {
    margin-bottom: 2rem;
  }

  .manage-section:last-child {
    margin-bottom: 0;
  }

  .manage-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .contestants-manage-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .contestant-manage-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    transition: all 0.2s;
  }

  .contestant-manage-item.dnf {
    background: #fef2f2;
    border-color: #fecaca;
    opacity: 0.7;
  }

  .contestant-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dnf-badge {
    background: #ef4444;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .btn-dnf {
    background: #f97316;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-dnf:hover {
    background: #ea580c;
  }

  .btn-reactivate {
    background: #10b981;
  }

  .btn-reactivate:hover {
    background: #059669;
  }
</style>
