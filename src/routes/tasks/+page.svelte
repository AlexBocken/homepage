<script>
  import { onDestroy } from 'svelte';
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
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
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
  import StickerPeel from '$lib/components/tasks/StickerPeel.svelte';
  import StickerOutline from '$lib/components/tasks/StickerOutline.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';

  // Traced silhouette of blobcat_adorable (scripts/trace-sticker-silhouettes.mjs)
  // — inlined so the empty-slot outline doesn't pull in the full silhouette map.
  const SLOT_OUTLINE =
    'M 39.022 22.750 C 36.814 30.474, 34 49.459, 34 56.628 C 34 62.801, 33.517 65.024, 31.140 69.779 C 19.093 93.878, 14.949 140.905, 23.569 155.688 C 43.493 189.853, 164.180 189.536, 176.995 155.285 C 181.877 142.234, 181.833 114.171, 176.892 89.943 L 174.801 79.689 176.872 72.595 C 180.830 59.033, 182.471 37.617, 179.917 32.846 C 178.103 29.455, 158.626 32.649, 141.986 39.066 L 133.888 42.189 126.194 40.129 C 110.683 35.978, 90.121 35.053, 77.633 37.946 C 73.946 38.800, 73.422 38.587, 66.319 33.334 C 56.674 26.201, 44.466 19, 42.018 19 C 40.652 19, 39.783 20.087, 39.022 22.750';
  import { getStickerForTags, getStickerById } from '$lib/utils/stickers';
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

  let { data } = $props();

  let tasks = $derived(data.tasks || []);
  let stats = $derived(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');
  /** @type {any} */
  let awardedSticker = $state(null);
  let filterTag = $state('');
  let filterAssignee = $state('');

  const USERS = ['anna', 'alexander'];
  /** @type {string | null} */
  let completeForTaskId = $state(null);
  /** @type {ReturnType<typeof setTimeout> | null} */
  let longPressTimer = $state(null);

  // Hero carousel (0 = urgent task, 1 = Stickerheft) + placement choreography.
  // pendingPlacement is armed in completeTask the moment a task is completed, so
  // the freshly-earned cat is rendered in its peeled-off (hidden) state and never
  // flashes pre-placed; clearing it lets the CSS transition peel it onto the shelf.
  let heroSlide = $state(0);
  // Newest cat lifecycle: 'idle' (static img) → 'armed' (hidden after completion,
  // before the popup closes) → 'peeling' (canvas plays the peel) → 'idle'.
  let peelState = $state('idle');
  const PEEL_MS = 1400; // sticker-peel duration
  /** @type {ReturnType<typeof setTimeout>[]} */
  let heroTimers = [];

  function clearHeroTimers() {
    heroTimers.forEach(clearTimeout);
    heroTimers = [];
  }

  /** @param {number} i */
  function selectHero(i) {
    clearHeroTimers(); // a manual tap cancels any running sequence
    peelState = 'idle';
    heroSlide = i;
  }

  // Swipe between the two heroes on touch devices.
  let swipeX = 0, swipeY = 0, swipeOn = false;
  let suppressTap = false; // a swipe shouldn't also fire the Erledigt tap
  /** @param {PointerEvent} e */
  function heroPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    swipeX = e.clientX;
    swipeY = e.clientY;
    swipeOn = true;
    suppressTap = false;
  }
  /** @param {PointerEvent} e */
  function heroPointerUp(e) {
    if (!swipeOn) return;
    swipeOn = false;
    const dx = e.clientX - swipeX;
    const dy = e.clientY - swipeY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      suppressTap = true;
      selectHero(dx < 0 ? Math.min(heroSlide + 1, 1) : Math.max(heroSlide - 1, 0));
    }
  }

  // After the reward popup closes: with urgent tasks still around (two heroes)
  // slide to the Stickerheft, then play the peel; onPeelDone glides back.
  function playStickerPlacement() {
    clearHeroTimers();
    if (topUrgent) {
      heroSlide = 1;
      heroTimers.push(setTimeout(() => { peelState = 'peeling'; }, 420));
    } else {
      heroTimers.push(setTimeout(() => { peelState = 'peeling'; }, 80));
    }
  }

  function onPeelDone() {
    peelState = 'idle';
    if (heroSlide === 1) {
      clearHeroTimers();
      heroTimers.push(setTimeout(() => { heroSlide = 0; }, 800)); // admire, then glide back
    }
  }

  function onStickerClosed() {
    awardedSticker = null;
    playStickerPlacement();
  }

  onDestroy(clearHeroTimers);

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

  // Hero data — independent of the list filters, always reflects real urgency.
  let allSorted = $derived(
    [...tasks].sort((/** @type {any} */ a, /** @type {any} */ b) =>
      new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  );
  let urgentTasks = $derived(
    allSorted.filter((/** @type {any} */ t) => {
      const c = getUrgencyClass(t);
      return c === 'overdue' || c === 'due-today';
    })
  );
  let topUrgent = $derived(urgentTasks[0] ?? null);
  let upcomingNext = $derived(allSorted[0] ?? null);

  // Reward shelf — up to 8 cats I've earned this week, ordered oldest → newest
  // so the freshest one lands on the right (next to the empty slots). Padded
  // with empty slots that hint at more to collect.
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let weekStickers = $derived(
    (stats.recentCompletions ?? [])
      .filter((/** @type {any} */ c) =>
        c.completedBy === currentUser && c.stickerId &&
        Date.now() - new Date(c.completedAt).getTime() < WEEK_MS)
      .map((/** @type {any} */ c) => getStickerById(c.stickerId))
      .filter(Boolean)
      .slice(0, 8)
      .reverse()
  );
  let emptySlots = $derived(Array.from({ length: Math.max(0, 6 - weekStickers.length) }));

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

    // Arm the shelf NOW (before the refresh below adds the new cat) so the
    // freshly-earned cat never renders pre-placed — it stays hidden until the
    // popup closes and we peel it on.
    clearHeroTimers();
    peelState = 'armed';

    // Persist in the background; tell the server which sticker we showed.
    const res = await fetch(`/api/tasks/${task._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stickerId: sticker.id, ...(forUser ? { completedFor: forUser } : {}) })
    });
    if (!res.ok) { peelState = 'idle'; return; }
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
</script>

<svelte:head><title>Aufgaben - Bocken</title></svelte:head>

<div class="tasks-page">
  <header class="page-header">
    <h1>Aufgaben</h1>

    {#if tasks.length > 0}
      {#snippet stickerShelf()}
        <div class="shelf">
          {#each weekStickers as s, i (i)}
            {@const isNewest = i === weekStickers.length - 1}
            {#if isNewest && peelState !== 'idle'}
              <!-- Landing cell: keep the outline until the peel has fully played,
                   with the peel canvas overlaid while it animates. -->
              <span class="shelf-cat landing">
                <span class="landing-outline" class:fading={peelState === 'peeling'} style="--fade: {PEEL_MS}ms">
                  <StickerOutline d={SLOT_OUTLINE} size={64} stroke="rgba(90, 74, 44, 0.38)" />
                </span>
                {#if peelState === 'peeling'}
                  <span class="peel-over">
                    <StickerPeel src="/stickers/{s.image}" size={64} duration={PEEL_MS} oncomplete={onPeelDone} />
                  </span>
                {/if}
              </span>
            {:else}
              <span class="shelf-cat">
                <img class="shelf-sticker" src="/stickers/{s.image}" alt={s.name} title={s.name} />
              </span>
            {/if}
          {/each}
          {#each emptySlots as _, i (i)}
            <StickerOutline d={SLOT_OUTLINE} size={64} stroke="rgba(90, 74, 44, 0.38)" />
          {/each}
        </div>
      {/snippet}

      {#snippet urgentHero()}
        {@const uClass = topUrgent ? getUrgencyClass(topUrgent) : ''}
        <section class="hero hero-urgent {uClass}">
          <div class="hero-eyebrow">
            <AlertCircle size={15} />
            <span>{getUrgencyLabel(topUrgent)}</span>
          </div>
          <div class="hero-main">
            <div class="hero-text">
              <h2 class="hero-title">{topUrgent.title}</h2>
              <div class="hero-meta">
                {#if topUrgent.tags?.length}
                  {#each topUrgent.tags.slice(0, 2) as tag (tag)}
                    <span class="hero-tag">
                      {#if TAG_ICONS[tag]}
                        {@const Icon = TAG_ICONS[tag]}
                        <Icon size={13} />
                      {/if}
                      {tag}
                    </span>
                  {/each}
                {/if}
                {#if topUrgent.assignees?.length}
                  <span class="hero-assignee">
                    <ProfilePicture username={topUrgent.assignees[0]} size={22} />
                    {topUrgent.assignees[0]}
                  </span>
                {/if}
              </div>
            </div>
            <div class="complete-wrapper hero-complete">
              {#if completeForTaskId === topUrgent._id}
                <div class="complete-for-popover" transition:scale={{ duration: 150, start: 0.9 }}>
                  <span class="popover-label">Erledigt für:</span>
                  {#each USERS as user (user)}
                    <button class="popover-user" onclick={() => completeTask(topUrgent, user)}>
                      <ProfilePicture username={user} size={28} />
                      <span>{user}</span>
                    </button>
                  {/each}
                  <button class="popover-close" onclick={() => completeForTaskId = null}>&times;</button>
                </div>
              {/if}
              <button
                class="hero-btn"
                onclick={() => { if (suppressTap) return; cancelLongPress(); if (!completeForTaskId) completeTask(topUrgent); }}
                onpointerdown={() => startLongPress(topUrgent)}
                onpointerup={cancelLongPress}
                onpointerleave={cancelLongPress}
                title="Klick = selbst erledigt, gedrückt halten = für andere"
              >
                <Check size={20} strokeWidth={2.5} /> Erledigt
              </button>
            </div>
          </div>
          {#if urgentTasks.length > 1}
            <p class="hero-more">Noch {urgentTasks.length - 1} {urgentTasks.length - 1 === 1 ? 'Aufgabe' : 'Aufgaben'} dringend</p>
          {/if}
        </section>
      {/snippet}

      {#snippet rewardHero()}
        <section class="hero hero-reward">
          <div class="hero-eyebrow done">
            <Sparkles size={15} />
            <span>{topUrgent ? 'Dein Stickerheft' : 'Für heute geschafft'}</span>
          </div>
          <p class="shelf-title">Diese Woche gesammelt</p>
          {@render stickerShelf()}
          {#if upcomingNext && !topUrgent}
            <p class="hero-more">Als Nächstes: {upcomingNext.title} · {getUrgencyLabel(upcomingNext)}</p>
          {/if}
        </section>
      {/snippet}

      {#if topUrgent}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="hero-carousel"
          onpointerdown={heroPointerDown}
          onpointerup={heroPointerUp}
          onpointercancel={() => (swipeOn = false)}
        >
          <div class="hero-track" style="transform: translateX(-{heroSlide * 100}%)">
            <div class="hero-slide">{@render urgentHero()}</div>
            <div class="hero-slide">{@render rewardHero()}</div>
          </div>
        </div>
        <div class="hero-dots" role="tablist" aria-label="Hero umschalten">
          <button class="hero-dot" class:active={heroSlide === 0} role="tab" aria-selected={heroSlide === 0} aria-label="Dringende Aufgabe" onclick={() => selectHero(0)}></button>
          <button class="hero-dot" class:active={heroSlide === 1} role="tab" aria-selected={heroSlide === 1} aria-label="Stickerheft" onclick={() => selectHero(1)}></button>
        </div>
      {:else}
        {@render rewardHero()}
      {/if}
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
  <StickerPopup sticker={awardedSticker} onclose={onStickerClosed} />
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

  /* ── Hero: adaptive "what's urgent now" / reward shelf ── */
  .hero {
    margin-bottom: 1rem;
    padding: 1.1rem 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--nord13) 6%, var(--color-surface));
  }
  .hero-urgent.overdue {
    background: color-mix(in srgb, var(--red) 9%, var(--color-surface));
    border-color: color-mix(in srgb, var(--red) 28%, var(--color-border));
  }
  .hero-urgent.due-today {
    background: color-mix(in srgb, var(--orange) 8%, var(--color-surface));
    border-color: color-mix(in srgb, var(--orange) 24%, var(--color-border));
  }
  /* Stickerheft hero uses the same warm dotted "paper" as the rewards album. */
  .hero-reward {
    background-color: #f3ecd9;
    background-image: radial-gradient(rgba(120, 100, 70, 0.16) 1px, transparent 1.4px);
    background-size: 18px 18px;
    border-color: #e4d9be;
    box-shadow: var(--shadow-sm), inset 0 0 40px rgba(150, 130, 90, 0.08);
  }
  .hero-reward .shelf-title { color: #5a4a2c; }
  .hero-reward .hero-more { color: #8a7747; }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }
  .hero-urgent.overdue .hero-eyebrow { color: var(--red); }
  .hero-urgent.due-today .hero-eyebrow { color: var(--orange); }
  .hero-eyebrow.done { color: var(--green); }

  .hero-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .hero-text { min-width: 0; }
  .hero-title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.15rem 0.55rem;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
    text-transform: capitalize;
  }
  .hero-assignee {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: capitalize;
  }

  .hero-complete { flex-shrink: 0; }
  .hero-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--green);
    color: var(--nord0); /* dark text — Nord green is light */
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms;
  }
  .hero-btn:hover { background: color-mix(in srgb, var(--green) 88%, black); transform: scale(1.03); }
  .hero-btn:active { transform: scale(0.97); }

  .hero-more {
    margin: 0.7rem 0 0;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  /* Reward shelf (shown when nothing is urgent) */
  .shelf-title {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
  .shelf {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
  }
  /* Resting cats are plain images; the peel animation is handled by an overlaid
     <canvas> (StickerPeel) only while a cat is being placed. */
  .shelf-cat {
    --cat: 64px;
    position: relative;
    display: inline-block;
    width: var(--cat);
    height: var(--cat);
    line-height: 0;
  }
  .shelf-cat.landing { position: relative; }
  .landing-outline {
    display: block;
    line-height: 0;
    transition: opacity var(--fade, 600ms) ease;
  }
  .landing-outline.fading { opacity: 0; } /* fade the outline out as the cat peels on */
  .peel-over {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .shelf-sticker {
    width: var(--cat);
    height: var(--cat);
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
  }

  /* ── Hero carousel (urgent ⇄ Stickerheft) ── */
  .hero-carousel {
    overflow: hidden;
    border-radius: var(--radius-lg);
    margin-bottom: 0.5rem;
    touch-action: pan-y; /* let horizontal swipes drive the carousel, keep vertical scroll */
  }
  .hero-track {
    display: flex;
    align-items: stretch;
    transition: transform 420ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hero-slide {
    flex: 0 0 100%;
    min-width: 0;
  }
  .hero-slide .hero {
    height: 100%;
    margin-bottom: 0;
  }

  .hero-dots {
    display: flex;
    justify-content: center;
    gap: 0.2rem;
    margin-bottom: 1rem;
  }
  .hero-dot {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .hero-dot::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-border);
    transition: all 200ms;
  }
  .hero-dot.active::before {
    background: var(--color-primary);
    transform: scale(1.3);
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-track { transition: none; }
    .hero-dot::before { transition: none; }
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
    .tasks-page { padding: 1rem 0.75rem 6rem; }
    h1 { font-size: 1.3rem; }
    .task-list { grid-template-columns: 1fr; }
    .task-actions { opacity: 1; }
    .btn-complete { width: 40px; height: 40px; }

    /* Hero stacks: title above a full-width complete button */
    .hero-main { flex-direction: column; align-items: stretch; gap: 0.85rem; }
    .hero-title { font-size: 1.35rem; }
    .hero-complete { width: 100%; }
    .hero-btn { width: 100%; }
    /* keep cats at 64px so they match the canvas peel overlay */
  }
</style>
