<script>
  import { invalidateAll } from '$app/navigation';
  import { formatDistanceToNow, isPast, isToday, differenceInDays, format } from 'date-fns';
  import { de } from 'date-fns/locale';
  import { Plus, Check, Pencil, Trash2, Tag, Users, RotateCcw, Calendar,
    Sparkles, Wind, Bath, UtensilsCrossed, CookingPot, WashingMachine,
    Flower2, Droplets, Leaf, ShoppingCart, Shirt, Brush } from 'lucide-svelte';
  import { fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import TaskForm from '$lib/components/tasks/TaskForm.svelte';
  import StickerPopup from '$lib/components/tasks/StickerPopup.svelte';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

  let { data } = $props();

  let tasks = $state(data.tasks || []);
  let stats = $state(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');
  let myStat = $derived(stats.userStats.find((/** @type {any} */ s) => s._id === currentUser));
  let showForm = $state(false);
  /** @type {any} */
  let editingTask = $state(null);
  /** @type {any} */
  let awardedSticker = $state(null);
  let filterTag = $state('');
  let filterAssignee = $state('');

  // Collect all unique tags from tasks
  let allTags = $derived([...new Set(tasks.flatMap((/** @type {any} */ t) => t.tags))].sort());
  let allAssignees = $derived([...new Set(tasks.flatMap((/** @type {any} */ t) => t.assignees))].sort());

  let filteredTasks = $derived(
    tasks.filter((/** @type {any} */ t) => {
      if (filterTag && !t.tags.includes(filterTag)) return false;
      if (filterAssignee && !t.assignees.includes(filterAssignee)) return false;
      return true;
    })
  );

  // Sort by urgency: overdue first, then by days until due
  let sortedTasks = $derived(
    [...filteredTasks].sort((/** @type {any} */ a, /** @type {any} */ b) => {
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    })
  );

  /** @param {any} task */
  function getUrgencyClass(task) {
    const due = new Date(task.nextDueDate);
    const days = differenceInDays(due, new Date());
    if (days < 0) return 'overdue';
    if (days === 0) return 'due-today';
    if (days <= 2) return 'due-soon';
    return 'upcoming';
  }

  /** German weekday names */
  const WEEKDAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  /** @param {any} task */
  function getUrgencyLabel(task) {
    const due = new Date(task.nextDueDate);
    if (isPast(due) && !isToday(due)) {
      return `Überfällig (${formatDistanceToNow(due, { locale: de, addSuffix: true })})`;
    }
    if (isToday(due)) return 'Heute fällig';
    const days = differenceInDays(due, new Date());
    if (days >= 1 && days <= 6) {
      return `Fällig am ${WEEKDAYS_DE[due.getDay()]}`;
    }
    return `Fällig ${formatDistanceToNow(due, { locale: de, addSuffix: true })}`;
  }

  /** @param {string} type */
  function getFrequencyLabel(type) {
    const labels = /** @type {Record<string, string>} */ ({
      daily: 'Täglich',
      weekly: 'Wöchentlich',
      biweekly: 'Alle 2 Wochen',
      monthly: 'Monatlich',
      custom: 'Benutzerdefiniert'
    });
    return labels[type] || type;
  }

  /** @param {any} task */
  async function completeTask(task) {
    const res = await fetch(`/api/tasks/${task._id}/complete`, { method: 'POST' });
    if (!res.ok) return;
    const result = await res.json();

    // Show sticker popup
    awardedSticker = result.sticker;

    // Refresh data
    await refreshTasks();
  }

  /** @param {any} task */
  async function deleteTask(task) {
    if (!confirm(`"${task.title}" wirklich löschen?`)) return;
    const res = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    if (res.ok) await refreshTasks();
  }

  async function refreshTasks() {
    const [tasksRes, statsRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/tasks/stats')
    ]);
    if (tasksRes.ok) tasks = (await tasksRes.json()).tasks;
    if (statsRes.ok) stats = await statsRes.json();
  }

  async function handleTaskSaved() {
    showForm = false;
    editingTask = null;
    await refreshTasks();
  }

  /** @param {any} task */
  function startEdit(task) {
    editingTask = task;
    showForm = true;
  }

  /** @type {Record<string, any>} */
  const TAG_ICONS = {
    putzen: Sparkles, saugen: Wind, wischen: Brush, bad: Bath,
    küche: UtensilsCrossed, kochen: CookingPot, abwasch: Droplets,
    wäsche: WashingMachine, bügeln: Shirt,
    pflanzen: Flower2, gießen: Droplets, düngen: Leaf, garten: Leaf,
    einkaufen: ShoppingCart, müll: Trash2,
  };

  /** @param {string} nickname */
  function getCompletionCount(nickname) {
    const stat = stats.userStats.find((/** @type {any} */ s) => s._id === nickname);
    return stat?.count || 0;
  }
</script>

<div class="tasks-page">
  <header class="page-header">
    <div class="header-top">
      <h1>Aufgaben</h1>
      <button class="btn-add" onclick={() => { editingTask = null; showForm = true; }}>
        <Plus size={18} /> Neue Aufgabe
      </button>
    </div>

    {#if myStat}
      <div class="scoreboard">
        <div class="score-card">
          <ProfilePicture username={currentUser} size={36} />
          <div class="score-info">
            <span class="score-count">{myStat.count} <span class="score-label">erledigt</span></span>
          </div>
        </div>
      </div>
    {/if}

    <div class="filters">
      {#if allTags.length > 0}
        <div class="filter-group">
          <Tag size={14} />
          <select bind:value={filterTag}>
            <option value="">Alle Tags</option>
            {#each allTags as tag}
              <option value={tag}>{tag}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if allAssignees.length > 0}
        <div class="filter-group">
          <Users size={14} />
          <select bind:value={filterAssignee}>
            <option value="">Alle Personen</option>
            {#each allAssignees as assignee}
              <option value={assignee}>{assignee}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  </header>

  {#if showForm}
    <div class="form-overlay" transition:fly={{ y: -20, duration: 200 }}>
      <TaskForm
        task={editingTask}
        onclosed={() => { showForm = false; editingTask = null; }}
        onsaved={handleTaskSaved}
      />
    </div>
  {/if}

  <div class="task-list">
    {#each sortedTasks as task (task._id)}
      <div
        class="task-card {getUrgencyClass(task)}"
        animate:flip={{ duration: 300 }}
        transition:fly={{ y: 20, duration: 200 }}
      >
        <div class="card-accent"></div>
        <div class="card-content">
          <div class="card-top-row">
            <div class="card-title-area">
              <h3>{task.title}</h3>
              {#if task.description}
                <p class="task-description">{task.description}</p>
              {/if}
            </div>
            {#if task.assignees?.length > 0}
              <div class="card-assignee">
                <ProfilePicture username={task.assignees[0]} size={36} />
                {#if task.assignees.length > 1}
                  <div class="assignee-extra">
                    <ProfilePicture username={task.assignees[1]} size={22} />
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="card-due">
            <Calendar size={14} />
            <span>{getUrgencyLabel(task)}</span>
          </div>

          {#if task.isRecurring && task.frequency}
            <span class="meta-badge recurring">
              <RotateCcw size={13} />
              {getFrequencyLabel(task.frequency.type)}
              {#if task.frequency.type === 'custom' && task.frequency.customDays}
                ({task.frequency.customDays} Tage)
              {/if}
            </span>
          {/if}

          {#if task.tags?.length > 0}
            <div class="task-tags">
              {#each task.tags as tag}
                <span class="tag">
                  {#if TAG_ICONS[tag]}
                    <svelte:component this={TAG_ICONS[tag]} size={14} />
                  {/if}
                  {tag}
                </span>
              {/each}
            </div>
          {/if}

          <div class="card-bottom-row">
            <div class="card-bottom-left">
              {#if task.lastCompletedBy}
                <div class="last-completed">
                  <ProfilePicture username={task.lastCompletedBy} size={16} />
                  <span>Zuletzt gemacht {formatDistanceToNow(new Date(task.lastCompletedAt), { locale: de, addSuffix: true })}</span>
                </div>
              {/if}
              <div class="task-actions">
                <button class="btn-icon" title="Bearbeiten" onclick={() => startEdit(task)}>
                  <Pencil size={14} />
                </button>
                <button class="btn-icon btn-icon-danger" title="Löschen" onclick={() => deleteTask(task)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <button class="btn-complete" onclick={() => completeTask(task)} title="Als erledigt markieren">
              <Check size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    {/each}

    {#if sortedTasks.length === 0}
      <div class="empty-state">
        <p>Keine Aufgaben gefunden.</p>
        <button class="btn-add" onclick={() => { editingTask = null; showForm = true; }}>
          <Plus size={18} /> Erste Aufgabe erstellen
        </button>
      </div>
    {/if}
  </div>
</div>

{#if awardedSticker}
  <StickerPopup sticker={awardedSticker} onclose={() => awardedSticker = null} />
{/if}

<style>
  .tasks-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--nord10);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms;
  }
  .btn-add:hover { background: var(--nord9); }

  /* Scoreboard */
  .scoreboard {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .score-card {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--color-bg-secondary, #f0ede6);
    border-radius: 12px;
    padding: 0.6rem 1.2rem;
  }
  .score-info {
    display: flex;
    flex-direction: column;
  }
  .score-count {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--nord10);
    line-height: 1.2;
  }
  .score-label {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--color-text-secondary, #999);
  }

  /* Filters */
  .filters {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--color-text-secondary, #888);
  }
  .filter-group select {
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 6px;
    background: var(--color-bg-primary, white);
    color: inherit;
    font-size: 0.8rem;
  }

  /* Form overlay */
  .form-overlay {
    margin-bottom: 1.5rem;
    max-width: 560px;
  }

  /* Task grid */
  .task-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  /* Card structure: left accent strip + content */
  .task-card {
    display: flex;
    background: var(--color-bg-secondary, #f0ede6);
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 250ms, transform 250ms;
    position: relative;
  }
  .task-card:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.08);
    transform: translateY(-2px);
  }

  /* Left accent strip — colored by urgency */
  .card-accent {
    width: 4px;
    flex-shrink: 0;
    background: var(--nord14);
    transition: width 200ms;
  }
  .task-card.overdue .card-accent { background: var(--nord11); width: 5px; }
  .task-card.due-today .card-accent { background: var(--nord12); }
  .task-card.due-soon .card-accent { background: var(--nord13); }
  .task-card.upcoming .card-accent { background: var(--nord14); }

  /* Subtle urgency background tints */
  .task-card.overdue { background: color-mix(in srgb, var(--nord11) 6%, var(--color-bg-secondary, #f0ede6)); }
  .task-card.due-today { background: color-mix(in srgb, var(--nord12) 5%, var(--color-bg-secondary, #f0ede6)); }

  .card-content {
    flex: 1;
    padding: 1rem 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  /* Top row: title + assignee pfp */
  .card-top-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .card-title-area {
    flex: 1;
    min-width: 0;
  }
  .card-title-area h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .task-description {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--color-text-secondary, #777);
    line-height: 1.4;
  }

  /* Assignee PFP top-right */
  .card-assignee {
    position: relative;
    flex-shrink: 0;
  }
  .assignee-extra {
    position: absolute;
    bottom: -4px;
    right: -6px;
    border: 2px solid var(--color-bg-secondary, #f0ede6);
    border-radius: 50%;
  }

  /* Due date line */
  .card-due {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary, #888);
  }
  .task-card.overdue .card-due { color: var(--nord11); }
  .task-card.due-today .card-due { color: var(--nord12); }
  .task-card.due-soon .card-due { color: var(--nord13); }

  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 100px;
    color: var(--color-text-secondary, #888);
    background: var(--color-bg-secondary, #f0ede6);
    font-size: 0.78rem;
    width: fit-content;
  }

  /* Tags — significantly larger */
  .task-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
    background: rgba(94, 129, 172, 0.1);
    color: var(--nord10);
    font-weight: 500;
  }

  /* Bottom row: last-completed + actions left, check button right */
  .card-bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    padding-top: 0.5rem;
  }

  .card-bottom-left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .last-completed {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--color-text-secondary, #aaa);
  }
  .last-completed span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .task-actions {
    display: flex;
    gap: 0.15rem;
    opacity: 0;
    transition: opacity 150ms;
  }
  .task-card:hover .task-actions { opacity: 1; }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary, #999);
    border-radius: 6px;
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-icon:hover {
    background: var(--color-bg-secondary, #f0ede6);
    color: var(--color-text-primary, #333);
  }
  .btn-icon-danger:hover {
    background: rgba(191, 97, 106, 0.1);
    color: var(--nord11);
  }

  /* Round check button — neutral default, green on hover */
  .btn-complete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid var(--color-border, #ddd);
    background: transparent;
    color: var(--color-text-secondary, #bbb);
    cursor: pointer;
    transition: all 200ms;
    flex-shrink: 0;
  }
  .btn-complete:hover {
    border-color: var(--nord14);
    background: var(--nord14);
    color: white;
    box-shadow: 0 2px 10px rgba(163, 190, 140, 0.35);
    transform: scale(1.08);
  }
  .btn-complete:active {
    transform: scale(0.95);
    background: #8fad7a;
    border-color: #8fad7a;
    color: white;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary, #999);
  }
  .empty-state p { margin-bottom: 1rem; }
  .empty-state .btn-add { margin: 0 auto; }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .task-card {
      background: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .task-card.overdue {
      background: color-mix(in srgb, var(--nord11) 8%, var(--nord2));
    }
    :global(:root:not([data-theme="light"])) .task-card.due-today {
      background: color-mix(in srgb, var(--nord12) 6%, var(--nord2));
    }
    :global(:root:not([data-theme="light"])) .score-card {
      background: var(--nord1);
    }
    :global(:root:not([data-theme="light"])) .btn-icon:hover {
      background: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .meta-badge {
      background: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .filter-group select {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .btn-complete {
      border-color: var(--nord3);
      color: var(--nord4);
    }
    :global(:root:not([data-theme="light"])) .assignee-extra {
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .tag {
      background: rgba(94, 129, 172, 0.15);
    }
  }
  :global(:root[data-theme="dark"]) .task-card {
    background: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .task-card.overdue {
    background: color-mix(in srgb, var(--nord11) 8%, var(--nord2));
  }
  :global(:root[data-theme="dark"]) .task-card.due-today {
    background: color-mix(in srgb, var(--nord12) 6%, var(--nord2));
  }
  :global(:root[data-theme="dark"]) .score-card {
    background: var(--nord1);
  }
  :global(:root[data-theme="dark"]) .meta-badge {
    background: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .filter-group select {
    background: var(--nord1);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .btn-complete {
    border-color: var(--nord3);
    color: var(--nord4);
  }
  :global(:root[data-theme="dark"]) .assignee-extra {
    border-color: var(--nord1);
  }
  :global(:root[data-theme="dark"]) .tag {
    background: rgba(94, 129, 172, 0.15);
  }

  @media (max-width: 600px) {
    .tasks-page { padding: 1rem 0.75rem; }
    h1 { font-size: 1.3rem; }
    .task-list { grid-template-columns: 1fr; }
    .task-actions { opacity: 1; }
    .scoreboard { gap: 0.5rem; }
    .score-card { padding: 0.5rem 1rem; min-width: 80px; }
    .score-count { font-size: 1.4rem; }
    .btn-complete { width: 40px; height: 40px; }
  }
</style>
