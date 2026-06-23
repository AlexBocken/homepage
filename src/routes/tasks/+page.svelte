<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { confirm } from '$lib/js/confirmDialog.svelte';
  import { formatDistanceToNow, isPast, isToday, differenceInDays, format } from 'date-fns';
  import { de } from 'date-fns/locale';
  import Plus from '@lucide/svelte/icons/plus';
  import Check from '@lucide/svelte/icons/check';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Tag from '@lucide/svelte/icons/tag';
  import Users from '@lucide/svelte/icons/users';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Wind from '@lucide/svelte/icons/wind';
  import Bath from '@lucide/svelte/icons/bath';
  import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
  import CookingPot from '@lucide/svelte/icons/cooking-pot';
  import WashingMachine from '@lucide/svelte/icons/washing-machine';
  import Flower2 from '@lucide/svelte/icons/flower-2';
  import Droplets from '@lucide/svelte/icons/droplets';
  import Leaf from '@lucide/svelte/icons/leaf';
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
  import Shirt from '@lucide/svelte/icons/shirt';
  import Brush from '@lucide/svelte/icons/brush';
  import { fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import StickerPopup from '$lib/components/tasks/StickerPopup.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { getStickerForTags } from '$lib/utils/stickers';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

  let { data } = $props();

  let tasks = $derived(data.tasks || []);
  let stats = $derived(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');
  let myStat = $derived(stats.userStats.find((/** @type {any} */ s) => s._id === currentUser));
  /** @type {any} */
  let awardedSticker = $state(null);
  let filterTag = $state('');
  let filterAssignee = $state('');

  const USERS = ['anna', 'alexander'];
  /** @type {string | null} */
  let completeForTaskId = $state(null);
  /** @type {ReturnType<typeof setTimeout> | null} */
  let longPressTimer = $state(null);

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

  /**
   * @param {any} task
   * @param {string} [forUser]
   */
  async function completeTask(task, forUser) {
    // Roll the sticker client-side and show it immediately — don't wait on the
    // POST roundtrip (DB writes) just to learn which sticker to display.
    const sticker = getStickerForTags(task.tags, task.difficulty || 'medium');
    // Warm the image cache so the cat is decoded by the time the popup finishes
    // its bounce-in, instead of fading into an empty circle.
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = `/stickers/${sticker.image}`;
    }
    awardedSticker = sticker;
    completeForTaskId = null;

    // Persist in the background; tell the server which sticker we showed.
    const res = await fetch(`/api/tasks/${task._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stickerId: sticker.id, ...(forUser ? { completedFor: forUser } : {}) })
    });
    if (!res.ok) return;
    await refreshTasks();
  }

  /** @param {any} task */
  function startLongPress(task) {
    longPressTimer = setTimeout(() => {
      completeForTaskId = task._id;
      longPressTimer = null;
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  /** @param {any} task */
  async function deleteTask(task) {
    if (!await confirm(`"${task.title}" wirklich löschen?`)) return;
    const res = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    if (res.ok) await refreshTasks();
  }

  async function refreshTasks() {
    await invalidateAll();
  }

  /** @param {any} task */
  function startEdit(task) {
    goto(resolve('/tasks/[id]/edit', { id: task._id }));
  }

  /** @type {Record<string, any>} */
  const TAG_ICONS = {
    putzen: Sparkles, saugen: Wind, wischen: Brush, bad: Bath,
    küche: UtensilsCrossed, kochen: CookingPot, abwasch: Droplets,
    wäsche: WashingMachine, bügeln: Shirt,
    pflanzen: Flower2, giessen: Droplets, düngen: Leaf, garten: Leaf,
    einkaufen: ShoppingCart, müll: Trash2,
  };

  /** @param {string} nickname */
  function getCompletionCount(nickname) {
    const stat = stats.userStats.find((/** @type {any} */ s) => s._id === nickname);
    return stat?.count || 0;
  }
</script>

<svelte:head><title>Aufgaben - Bocken</title></svelte:head>

<div class="tasks-page">
  <header class="page-header">
    <h1>Aufgaben</h1>

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
        <div class="filter-row">
          <span class="filter-label"><Tag size={14} /> Tags</span>
          <div class="pill-group">
            <button class="filter-pill" class:active={filterTag === ''} onclick={() => filterTag = ''}>Alle</button>
            {#each allTags as tag (tag)}
              <button
                class="filter-pill"
                class:active={filterTag === tag}
                onclick={() => filterTag = filterTag === tag ? '' : tag}
              >
                {#if TAG_ICONS[tag]}
                  {@const Icon = TAG_ICONS[tag]}
                  <Icon size={13} />
                {/if}
                {tag}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      {#if allAssignees.length > 0}
        <div class="filter-row">
          <span class="filter-label"><Users size={14} /> Personen</span>
          <div class="pill-group">
            <button class="filter-pill" class:active={filterAssignee === ''} onclick={() => filterAssignee = ''}>Alle</button>
            {#each allAssignees as assignee (assignee)}
              <button
                class="filter-pill person"
                class:active={filterAssignee === assignee}
                onclick={() => filterAssignee = filterAssignee === assignee ? '' : assignee}
              >
                <ProfilePicture username={assignee} size={18} />
                {assignee}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </header>

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
              {#each task.tags as tag (tag)}
                <span class="tag">
                  {#if TAG_ICONS[tag]}
                    {@const Icon = TAG_ICONS[tag]}
                    <Icon size={14} />
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
            <div class="complete-wrapper">
              {#if completeForTaskId === task._id}
                <div class="complete-for-popover" transition:scale={{ duration: 150, start: 0.9 }}>
                  <span class="popover-label">Erledigt für:</span>
                  {#each USERS as user (user)}
                    <button class="popover-user" onclick={() => completeTask(task, user)}>
                      <ProfilePicture username={user} size={28} />
                      <span>{user}</span>
                    </button>
                  {/each}
                  <button class="popover-close" onclick={() => completeForTaskId = null}>&times;</button>
                </div>
              {/if}
              <button
                class="btn-complete"
                onclick={() => { cancelLongPress(); if (!completeForTaskId) completeTask(task); }}
                onpointerdown={() => startLongPress(task)}
                onpointerup={cancelLongPress}
                onpointerleave={cancelLongPress}
                title="Klick = selbst erledigt, gedrückt halten = für andere"
              >
                <Check size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    {/each}

    {#if sortedTasks.length === 0}
      <div class="empty-state">
        <p>Keine Aufgaben gefunden.</p>
        <a class="btn-add" href={resolve('/tasks/new')}>
          <Plus size={18} /> Erste Aufgabe erstellen
        </a>
      </div>
    {/if}
  </div>
</div>

<ActionButton href={resolve('/tasks/new')} ariaLabel="Neue Aufgabe">
  <svg class="icon_svg" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>
</ActionButton>

{#if awardedSticker}
  <StickerPopup sticker={awardedSticker} onclose={() => awardedSticker = null} />
{/if}

<style>
  .tasks-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem 6rem; /* bottom space so the FAB never covers a card */
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 1rem;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-normal);
    text-decoration: none;
  }
  .btn-add:hover { background: var(--color-primary-hover); }

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
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 0.6rem 1.2rem;
  }
  .score-info {
    display: flex;
    flex-direction: column;
  }
  .score-count {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--color-primary);
    line-height: 1.2;
  }
  .score-label {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  /* Filters — pill toggles */
  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .filter-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .filter-label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    text-transform: capitalize;
    transition: var(--transition-fast);
  }
  .filter-pill.person { padding-left: 0.3rem; }
  .filter-pill:hover {
    background: var(--color-bg-elevated);
    scale: 1.05;
  }
  .filter-pill.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-text-on-primary);
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
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow var(--transition-normal), transform var(--transition-normal);
    position: relative;
  }
  .task-card:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
  }

  /* Left accent strip — colored by urgency */
  .card-accent {
    width: 4px;
    flex-shrink: 0;
    background: var(--green);
    transition: width 200ms;
  }
  .task-card.overdue .card-accent { background: var(--red); width: 5px; }
  .task-card.due-today .card-accent { background: var(--orange); }
  .task-card.due-soon .card-accent { background: var(--nord13); }
  .task-card.upcoming .card-accent { background: var(--green); }

  /* Subtle urgency background tints */
  .task-card.overdue { background: color-mix(in srgb, var(--red) 6%, var(--color-surface)); }
  .task-card.due-today { background: color-mix(in srgb, var(--orange) 5%, var(--color-surface)); }

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
    color: var(--color-text-secondary);
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
    border: 2px solid var(--color-surface);
    border-radius: 50%;
  }

  /* Due date line */
  .card-due {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .task-card.overdue .card-due { color: var(--red); }
  .task-card.due-today .card-due { color: var(--orange); }
  .task-card.due-soon .card-due { color: var(--nord13); }

  .meta-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-pill);
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
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
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
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
    color: var(--color-text-secondary);
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
    color: var(--color-text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .btn-icon:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
  }
  .btn-icon-danger:hover {
    background: color-mix(in srgb, var(--red) 12%, transparent);
    color: var(--red);
  }

  /* Complete button wrapper with popover */
  .complete-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .complete-for-popover {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.5rem;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    z-index: 20;
    min-width: 140px;
  }
  .popover-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    padding: 0 0.25rem 0.15rem;
  }
  .popover-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 500;
    text-transform: capitalize;
    color: var(--color-text-primary);
    transition: background var(--transition-fast);
  }
  .popover-user:hover {
    background: var(--color-bg-elevated);
  }
  .popover-close {
    position: absolute;
    top: 0.25rem;
    right: 0.35rem;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.1rem 0.25rem;
    border-radius: var(--radius-sm);
  }
  .popover-close:hover {
    color: var(--color-text-primary);
  }

  /* Round check button — neutral default, green on hover */
  .btn-complete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: transparent;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all 200ms;
    flex-shrink: 0;
  }
  .btn-complete:hover {
    border-color: var(--green);
    background: var(--green);
    color: white;
    box-shadow: 0 2px 10px color-mix(in srgb, var(--green) 35%, transparent);
    transform: scale(1.08);
  }
  .btn-complete:active {
    transform: scale(0.95);
    background: color-mix(in srgb, var(--green) 80%, black);
    border-color: color-mix(in srgb, var(--green) 80%, black);
    color: white;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-secondary);
  }
  .empty-state p { margin-bottom: 1rem; }
  .empty-state .btn-add { margin: 0 auto; width: fit-content; }

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
