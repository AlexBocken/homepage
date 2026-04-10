<script>
  import { X, Sparkles, Wind, Bath, UtensilsCrossed, CookingPot, WashingMachine,
    Flower2, Droplets, Leaf, ShoppingCart, Trash2, Shirt, Brush } from '@lucide/svelte';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  const USERS = ['anna', 'alexander'];

  let {
    task = null,
    onclosed,
    onsaved
  } = $props();

  /** @type {{tag: string, icon: any}[]} */
  const AVAILABLE_TAGS = [
    { tag: 'putzen', icon: Sparkles },
    { tag: 'saugen', icon: Wind },
    { tag: 'wischen', icon: Brush },
    { tag: 'bad', icon: Bath },
    { tag: 'küche', icon: UtensilsCrossed },
    { tag: 'kochen', icon: CookingPot },
    { tag: 'abwasch', icon: Droplets },
    { tag: 'wäsche', icon: WashingMachine },
    { tag: 'bügeln', icon: Shirt },
    { tag: 'pflanzen', icon: Flower2 },
    { tag: 'gießen', icon: Droplets },
    { tag: 'düngen', icon: Leaf },
    { tag: 'garten', icon: Leaf },
    { tag: 'einkaufen', icon: ShoppingCart },
    { tag: 'müll', icon: Trash2 },
  ];

  // svelte-ignore state_referenced_locally
  let title = $state(task?.title || '');
  // svelte-ignore state_referenced_locally
  let description = $state(task?.description || '');
  /** @type {string[]} */
  // svelte-ignore state_referenced_locally
  let selectedAssignees = $state(task?.assignees ? [...task.assignees] : []);
  /** @type {string[]} */
  // svelte-ignore state_referenced_locally
  let selectedTags = $state(task?.tags ? [...task.tags] : []);
  // svelte-ignore state_referenced_locally
  let difficulty = $state(task?.difficulty || '');
  // svelte-ignore state_referenced_locally
  let refreshMode = $state(task?.refreshMode || 'completion');
  // svelte-ignore state_referenced_locally
  let isRecurring = $state(task?.isRecurring || false);
  // svelte-ignore state_referenced_locally
  let frequencyType = $state(task?.frequency?.type || 'weekly');
  // svelte-ignore state_referenced_locally
  let customDays = $state(task?.frequency?.customDays || 7);
  // svelte-ignore state_referenced_locally
  let nextDueDate = $state(
    task?.nextDueDate
      ? new Date(task.nextDueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  let saving = $state(false);
  /** @type {string | null} */
  let error = $state(null);

  // Desktop tag input
  let tagInput = $state('');
  let tagDropdownOpen = $state(false);

  let unselectedTags = $derived(AVAILABLE_TAGS.filter(t => !selectedTags.includes(t.tag)));
  let filteredDropdownTags = $derived(
    tagInput.trim() === ''
      ? unselectedTags
      : unselectedTags.filter(t => t.tag.includes(tagInput.toLowerCase()))
  );

  /** @param {string} tag */
  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  function handleTagInputFocus() {
    tagDropdownOpen = true;
  }

  /** @param {FocusEvent} _event */
  function handleTagInputBlur(_event) {
    setTimeout(() => {
      tagDropdownOpen = false;
      tagInput = '';
    }, 200);
  }

  /** @param {KeyboardEvent} event */
  function handleTagKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = tagInput.trim().toLowerCase();
      const matched = AVAILABLE_TAGS.find(t => t.tag === value) || filteredDropdownTags[0];
      if (matched && !selectedTags.includes(matched.tag)) {
        toggleTag(matched.tag);
        tagInput = '';
      }
    } else if (event.key === 'Escape') {
      tagDropdownOpen = false;
      tagInput = '';
    }
  }

  /** @param {string} tag */
  function selectDropdownTag(tag) {
    toggleTag(tag);
    tagInput = '';
    tagDropdownOpen = false;
  }

  /** @param {string} tag */
  function getTagIcon(tag) {
    return AVAILABLE_TAGS.find(t => t.tag === tag)?.icon;
  }

  async function handleSubmit() {
    if (!title.trim()) { error = 'Titel ist erforderlich'; return; }
    saving = true;
    error = null;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      assignees: selectedAssignees,
      tags: selectedTags,
      difficulty: difficulty || undefined,
      isRecurring,
      refreshMode: isRecurring ? refreshMode : undefined,
      frequency: isRecurring ? {
        type: frequencyType,
        customDays: frequencyType === 'custom' ? customDays : undefined
      } : undefined,
      nextDueDate
    };

    const url = task?._id ? `/api/tasks/${task._id}` : '/api/tasks';
    const method = task?._id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      onsaved?.(new CustomEvent('saved'));
    } else {
      const data = await res.json().catch(() => ({}));
      error = data.message || 'Fehler beim Speichern';
    }
    saving = false;
  }
</script>

<form class="task-form" onsubmit={e => { e.preventDefault(); handleSubmit(); }}>
  <div class="form-header">
    <h2>{task?._id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
    <button type="button" class="btn-close" onclick={onclosed}><X size={18} /></button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="field">
    <label for="title">Titel *</label>
    <input id="title" type="text" bind:value={title} placeholder="z.B. Staubsaugen" required />
  </div>

  <div class="field">
    <label for="description">Beschreibung</label>
    <textarea id="description" bind:value={description} placeholder="Optionale Details..." rows="2"></textarea>
  </div>

  <div class="field">
    <span class="label">Zugewiesen an</span>
    <div class="assignee-buttons" role="group" aria-label="Zugewiesen an">
      {#each USERS as user}
        <button
          type="button"
          class="assignee-btn"
          class:selected={selectedAssignees.includes(user)}
          onclick={() => {
            if (selectedAssignees.includes(user)) {
              selectedAssignees = selectedAssignees.filter(a => a !== user);
            } else {
              selectedAssignees = [...selectedAssignees, user];
            }
          }}
        >
          <ProfilePicture username={user} size={26} />
          <span class="assignee-name">{user}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Tags: desktop = input + dropdown, mobile = pill buttons -->
  <div class="field">
    <span class="label">Tags</span>
    <span class="hint">Bestimmen Sticker-Belohnungen</span>

    <!-- Desktop: input with dropdown -->
    <div class="tag-input-desktop">
      <div class="tag-input-wrapper">
        <input
          type="text"
          bind:value={tagInput}
          onfocus={handleTagInputFocus}
          onblur={handleTagInputBlur}
          onkeydown={handleTagKeyDown}
          placeholder="Tag eingeben oder auswählen..."
          autocomplete="off"
        />
        {#if tagDropdownOpen && filteredDropdownTags.length > 0}
          <div class="tag-dropdown">
            {#each filteredDropdownTags as { tag, icon: Icon }}
              <button type="button" class="tag-dropdown-item" onclick={() => selectDropdownTag(tag)}>
                <Icon size={14} />
                {tag}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Mobile: pill buttons -->
    <div class="tag-pills-mobile">
      {#each AVAILABLE_TAGS as { tag, icon: Icon }}
        <button
          type="button"
          class="tag-pill"
          class:selected={selectedTags.includes(tag)}
          onclick={() => toggleTag(tag)}
        >
          <Icon size={14} />
          {tag}
        </button>
      {/each}
    </div>

    <!-- Selected tags (shown on desktop below input) -->
    {#if selectedTags.length > 0}
      <div class="selected-tags">
        {#each selectedTags as tag}
          {@const Icon = getTagIcon(tag)}
          <button type="button" class="tag-chip selected" onclick={() => toggleTag(tag)}>
            {#if Icon}
              <Icon size={13} />
            {/if}
            {tag}
            <span class="remove-x">&times;</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="field">
    <span class="label">Schwierigkeit</span>
    <span class="hint">Schwerere Aufgaben geben seltenere Sticker</span>
    <div class="difficulty-buttons">
      <button
        type="button"
        class="diff-btn"
        class:selected={difficulty === '' || difficulty === undefined}
        onclick={() => difficulty = ''}
      >
        Keine
      </button>
      <button
        type="button"
        class="diff-btn low"
        class:selected={difficulty === 'low'}
        onclick={() => difficulty = 'low'}
      >
        Leicht
      </button>
      <button
        type="button"
        class="diff-btn medium"
        class:selected={difficulty === 'medium'}
        onclick={() => difficulty = 'medium'}
      >
        Mittel
      </button>
      <button
        type="button"
        class="diff-btn high"
        class:selected={difficulty === 'high'}
        onclick={() => difficulty = 'high'}
      >
        Schwer
      </button>
    </div>
  </div>

  <div class="field">
    <label for="dueDate">Fällig am</label>
    <DatePicker bind:value={nextDueDate} lang="de" />
  </div>

  <div class="field-row">
    <Toggle bind:checked={isRecurring} label="Wiederkehrend" accentColor="var(--nord10)" />
  </div>

  {#if isRecurring}
    <div class="field">
      <label for="frequency">Häufigkeit</label>
      <select id="frequency" bind:value={frequencyType}>
        <option value="daily">Täglich</option>
        <option value="weekly">Wöchentlich</option>
        <option value="biweekly">Alle 2 Wochen</option>
        <option value="monthly">Monatlich</option>
        <option value="custom">Benutzerdefiniert</option>
      </select>
    </div>

    {#if frequencyType === 'custom'}
      <div class="field">
        <label for="customDays">Alle X Tage</label>
        <input id="customDays" type="number" bind:value={customDays} min="1" max="365" />
      </div>
    {/if}

    <div class="field">
      <span class="label">Nächstes Fälligkeitsdatum berechnen ab</span>
      <div class="refresh-mode-buttons">
        <button
          type="button"
          class="refresh-btn"
          class:selected={refreshMode === 'completion'}
          onclick={() => refreshMode = 'completion'}
        >
          Erledigung
        </button>
        <button
          type="button"
          class="refresh-btn"
          class:selected={refreshMode === 'planned'}
          onclick={() => refreshMode = 'planned'}
        >
          Geplantes Datum
        </button>
      </div>
      <span class="hint">
        {refreshMode === 'completion'
          ? 'Intervall startet ab dem Zeitpunkt der Erledigung'
          : 'Intervall startet ab dem geplanten Fälligkeitsdatum (holt auf bei Verspätung)'}
      </span>
    </div>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn-cancel" onclick={onclosed}>Abbrechen</button>
    <button type="submit" class="btn-save" disabled={saving}>
      {saving ? 'Speichern...' : (task?._id ? 'Aktualisieren' : 'Erstellen')}
    </button>
  </div>
</form>

<style>
  .task-form {
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #e8e4dd);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .form-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary, #999);
    border-radius: 6px;
    cursor: pointer;
  }
  .btn-close:hover { background: var(--color-bg-secondary, #f0ede6); }

  .error {
    color: var(--nord11);
    font-size: 0.82rem;
    margin: 0 0 0.75rem;
    padding: 0.4rem 0.6rem;
    background: rgba(191, 97, 106, 0.08);
    border-radius: 6px;
  }

  .field {
    margin-bottom: 0.75rem;
  }
  .field label, .field .label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: var(--color-text-secondary, #666);
  }
  .field input[type="text"],
  .field input[type="date"],
  .field input[type="number"],
  .field textarea,
  .field select {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    font-size: 0.85rem;
    background: var(--color-bg-primary, white);
    color: inherit;
    box-sizing: border-box;
  }
  .field textarea { resize: vertical; }
  .hint {
    font-size: 0.7rem;
    color: var(--color-text-secondary, #aaa);
    display: block;
    margin-bottom: 0.3rem;
  }

  /* ── Assignee buttons ── */
  .assignee-buttons {
    display: flex;
    gap: 0.5rem;
  }
  .assignee-btn {
    all: unset;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.75rem 0.35rem 0.35rem;
    border-radius: 100px;
    cursor: pointer;
    border: 1.5px solid var(--color-border, #ddd);
    background: transparent;
    transition: all 120ms;
    text-transform: capitalize;
  }
  .assignee-btn:hover {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.06);
  }
  .assignee-btn.selected {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.12);
  }
  .assignee-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--color-text-primary, #333);
  }

  /* ── Tag input (desktop) ── */
  .tag-input-desktop {
    position: relative;
  }
  .tag-input-wrapper {
    position: relative;
  }
  .tag-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
    padding: 0.35rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .tag-dropdown-item {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    border-radius: 100px;
    cursor: pointer;
    color: var(--color-text-secondary, #666);
    background: var(--color-bg-secondary, #f0ede6);
    transition: all 100ms;
  }
  .tag-dropdown-item:hover {
    background: var(--nord10);
    color: white;
    transform: scale(1.03);
  }

  /* ── Tag pills (mobile) ── */
  .tag-pills-mobile {
    display: none;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .tag-pill {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.65rem;
    font-size: 0.78rem;
    border-radius: 100px;
    cursor: pointer;
    user-select: none;
    transition: all 120ms;
    background: var(--color-bg-secondary, #f0ede6);
    color: var(--color-text-secondary, #777);
    border: 1.5px solid transparent;
  }
  .tag-pill:hover {
    background: rgba(94, 129, 172, 0.12);
    color: var(--nord10);
  }
  .tag-pill:active {
    transform: scale(0.95);
  }
  .tag-pill.selected {
    background: var(--nord10);
    color: white;
    border-color: var(--nord10);
  }
  .tag-pill.selected:hover {
    background: var(--nord9);
    border-color: var(--nord9);
  }

  /* ── Selected tags (shown below input on desktop) ── */
  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.35rem;
  }
  .tag-chip {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.55rem;
    font-size: 0.75rem;
    border-radius: 100px;
    cursor: pointer;
    transition: all 100ms;
    user-select: none;
  }
  .tag-chip.selected {
    background: var(--nord10);
    color: white;
  }
  .tag-chip.selected:hover {
    background: var(--nord9);
    transform: scale(1.03);
  }
  .remove-x {
    font-size: 0.9rem;
    font-weight: 700;
    margin-left: 0.1rem;
    line-height: 1;
  }

  /* Responsive: show pills on mobile, input on desktop */
  @media (max-width: 700px) {
    .tag-input-desktop { display: none; }
    .tag-pills-mobile { display: flex; }
    .selected-tags { display: none; }
  }
  @media (min-width: 701px) {
    .tag-pills-mobile { display: none; }
  }

  /* ── Difficulty buttons ── */
  .difficulty-buttons {
    display: flex;
    gap: 0.4rem;
  }
  .diff-btn {
    all: unset;
    flex: 1;
    text-align: center;
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    border: 1.5px solid var(--color-border, #ddd);
    transition: all 120ms;
    color: var(--color-text-secondary, #777);
  }
  .diff-btn:hover {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.06);
  }
  .diff-btn.selected {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.1);
    color: var(--nord10);
    font-weight: 600;
  }
  .diff-btn.low.selected {
    border-color: var(--nord14);
    background: rgba(163, 190, 140, 0.12);
    color: var(--nord14);
  }
  .diff-btn.medium.selected {
    border-color: var(--nord13);
    background: rgba(235, 203, 139, 0.12);
    color: #b8a038;
  }
  .diff-btn.high.selected {
    border-color: var(--nord12);
    background: rgba(208, 135, 112, 0.12);
    color: var(--nord12);
  }

  /* ── Refresh mode buttons ── */
  .refresh-mode-buttons {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }
  .refresh-btn {
    all: unset;
    flex: 1;
    text-align: center;
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    border: 1.5px solid var(--color-border, #ddd);
    transition: all 120ms;
    color: var(--color-text-secondary, #777);
  }
  .refresh-btn:hover {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.06);
  }
  .refresh-btn.selected {
    border-color: var(--nord10);
    background: rgba(94, 129, 172, 0.1);
    color: var(--nord10);
    font-weight: 600;
  }

  .field-row {
    margin-bottom: 0.75rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .btn-cancel {
    padding: 0.45rem 1rem;
    border: 1px solid var(--color-border, #ddd);
    background: transparent;
    border-radius: 8px;
    font-size: 0.82rem;
    cursor: pointer;
    color: var(--color-text-secondary, #888);
  }
  .btn-save {
    padding: 0.45rem 1rem;
    border: none;
    background: var(--nord10);
    color: white;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms;
  }
  .btn-save:hover { background: var(--nord9); }
  .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .task-form {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .field input,
    :global(:root:not([data-theme="light"])) .field textarea,
    :global(:root:not([data-theme="light"])) .field select {
      background: var(--nord0);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .tag-dropdown {
      background: var(--nord0);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .tag-dropdown-item {
      background: var(--nord2);
      color: var(--nord4);
    }
    :global(:root:not([data-theme="light"])) .tag-pill {
      background: var(--nord2);
      color: var(--nord4);
    }
  }
  :global(:root[data-theme="dark"]) .task-form {
    background: var(--nord1);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .field input,
  :global(:root[data-theme="dark"]) .field textarea,
  :global(:root[data-theme="dark"]) .field select {
    background: var(--nord0);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .tag-dropdown {
    background: var(--nord0);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .tag-dropdown-item {
    background: var(--nord2);
    color: var(--nord4);
  }
  :global(:root[data-theme="dark"]) .tag-pill {
    background: var(--nord2);
    color: var(--nord4);
  }
</style>
