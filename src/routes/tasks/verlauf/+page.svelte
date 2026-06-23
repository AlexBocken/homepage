<script>
  import { invalidateAll } from '$app/navigation';
  import { getStickerById, getDropChance, stickerUrl } from '$lib/utils/stickers';
  import { formatDistanceToNow, format } from 'date-fns';
  import { de } from 'date-fns/locale';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import StickerCalendar from '$lib/components/tasks/StickerCalendar.svelte';
  import VinylStickerCard from '$lib/components/tasks/VinylStickerCard.svelte';

  let { data } = $props();

  /** @type {import('$lib/utils/stickers').Sticker | null} */
  let selected = $state(null);

  let stats = $derived(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');

  // id -> times earned (current user) — for the sticker card
  let counts = $derived.by(() => {
    /** @type {Map<string, number>} */
    const m = new Map();
    for (const entry of stats.userStickers) {
      if (entry._id.user === currentUser) m.set(entry._id.sticker, entry.count);
    }
    return m;
  });

  // id -> { first earned label, most-recent source task } — for the sticker card
  let info = $derived.by(() => {
    /** @type {Map<string, { first: string, task: string }>} */
    const m = new Map();
    for (const c of stats.recentCompletions || []) {
      if (c.completedBy !== currentUser || !c.stickerId) continue;
      const prev = m.get(c.stickerId);
      m.set(c.stickerId, {
        first: format(new Date(c.completedAt), 'd. MMM yyyy', { locale: de }),
        task: prev ? prev.task : c.taskTitle || ''
      });
    }
    return m;
  });

  // Total tasks I've completed (server-aggregated, not capped by recentCompletions).
  let totalCompleted = $derived(
    stats.userStats.find((/** @type {any} */ s) => s._id === currentUser)?.count ?? 0
  );

  // who-did-what colours (matches the calendar)
  const PERSON_COLOR = /** @type {Record<string, string>} */ ({
    anna: 'var(--nord15)',
    alexander: 'var(--nord10)'
  });
  const personColor = /** @param {string} who */ (who) => PERSON_COLOR[who?.toLowerCase()] || 'var(--nord12)';

  // Logbook of my sticker drops, paginated client-side over the (already loaded)
  // recent completions, auto-extending as you scroll to the end.
  const PAGE = 15;
  let recentAll = $derived(
    stats.recentCompletions
      .filter((/** @type {any} */ c) => c.stickerId)
      .filter((/** @type {any} */ c) => !currentUser || c.completedBy === currentUser)
  );
  let shownCount = $state(PAGE);
  let recentShown = $derived(recentAll.slice(0, shownCount));
  let hasMore = $derived(shownCount < recentAll.length);

  /** Auto-load the next page when the sentinel scrolls into view. */
  function infiniteScroll(/** @type {HTMLElement} */ node) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && shownCount < recentAll.length) shownCount += PAGE;
      },
      { rootMargin: '300px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }

  /** @param {string} id */
  async function deleteCompletion(id) {
    const res = await fetch(`/api/tasks/completions/${id}`, { method: 'DELETE' });
    if (res.ok) await invalidateAll();
  }

  // --- edit a gained sticker's date ---
  let editingId = $state('');
  let editValue = $state('');

  /** @param {any} c */
  function startEdit(c) {
    editingId = c._id;
    editValue = format(new Date(c.completedAt), "yyyy-MM-dd'T'HH:mm");
  }
  function cancelEdit() {
    editingId = '';
    editValue = '';
  }
  /** @param {string} id */
  async function saveEdit(id) {
    if (!editValue) return;
    const completedAt = new Date(editValue);
    if (isNaN(completedAt.getTime())) return;
    const res = await fetch(`/api/tasks/completions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: completedAt.toISOString() })
    });
    if (res.ok) {
      editingId = '';
      await invalidateAll();
    }
  }
</script>

<svelte:head><title>Verlauf - Bocken</title></svelte:head>

<div class="verlauf-page">
  <header class="page-header">
    <h1>Verlauf</h1>
    <p class="total-completed">
      <strong>{totalCompleted}</strong> {totalCompleted === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt
    </p>
  </header>

  <StickerCalendar completions={stats.recentCompletions} {currentUser} onpick={(/** @type {any} */ s) => (selected = s)} />

  {#if recentAll.length > 0}
    <section class="logbook">
      <h2 class="logbook-title">Letzte Sticker</h2>
      <div class="recent-list">
        {#each recentShown as completion (completion._id)}
          {@const sticker = getStickerById(completion.stickerId)}
          {#if sticker}
            <div class="entry" class:editing={editingId === completion._id} style="--pc: {personColor(completion.completedBy)}">
              <img class="entry-cat" src={stickerUrl(sticker.image)} alt={sticker.name} loading="lazy" />
              <div class="entry-info">
                <span class="entry-task">{completion.taskTitle}</span>
                {#if editingId === completion._id}
                  <input
                    class="date-edit"
                    type="datetime-local"
                    bind:value={editValue}
                    aria-label="Datum bearbeiten"
                  />
                {:else}
                  <span class="entry-meta">
                    <span class="who-dot"></span>{completion.completedBy} &middot; {formatDistanceToNow(new Date(completion.completedAt), { locale: de, addSuffix: true })}
                  </span>
                {/if}
              </div>
              {#if completion.completedBy === currentUser}
                {#if editingId === completion._id}
                  <button class="btn-row-action save" title="Speichern" onclick={() => saveEdit(completion._id)}>
                    <Check size={15} />
                  </button>
                  <button class="btn-row-action" title="Abbrechen" onclick={cancelEdit}>
                    <X size={15} />
                  </button>
                {:else}
                  <button class="btn-row-action edit" title="Datum bearbeiten" onclick={() => startEdit(completion)}>
                    <Pencil size={14} />
                  </button>
                  <button class="btn-row-action danger" title="Eintrag löschen" onclick={() => deleteCompletion(completion._id)}>
                    <Trash2 size={14} />
                  </button>
                {/if}
              {/if}
            </div>
          {/if}
        {/each}
      </div>
      {#if hasMore}
        <div class="load-more" {@attach infiniteScroll}>lädt …</div>
      {/if}
    </section>
  {/if}

  {#if selected}
    {@const meta = info.get(selected.id)}
    <VinylStickerCard
      sticker={selected}
      owned={counts.has(selected.id)}
      count={counts.get(selected.id) || 0}
      dropChance={getDropChance(selected, 'medium')}
      firstEarnedLabel={meta?.first || ''}
      sourceTask={meta?.task || ''}
      onclose={() => (selected = null)}
    />
  {/if}
</div>

<style>
  .verlauf-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  h1 {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0;
  }
  .total-completed {
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  .total-completed strong {
    color: var(--color-text-primary);
    font-weight: 700;
  }

  /* Logbook — a paper journal matching the album + calendar. */
  .logbook {
    margin-top: 2.5rem;
    padding: 1.25rem 1.25rem 0.75rem;
    border-radius: var(--radius-lg);
    background-color: #f3ecd9;
    background-image: radial-gradient(rgba(120, 100, 70, 0.16) 1px, transparent 1.4px);
    background-size: 18px 18px;
    border: 1px solid #e4d9be;
    box-shadow: var(--shadow-sm), inset 0 0 50px rgba(150, 130, 90, 0.08);
  }
  :global(:root[data-theme='dark']) .logbook,
  :global(:root:not([data-theme='light'])) .logbook {
    background-color: #ece3cb;
  }
  .logbook-title {
    margin: 0 0 0.5rem;
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-weight: 600;
    font-size: 1.15rem;
    color: #5a4a2c;
  }
  .recent-list {
    display: flex;
    flex-direction: column;
  }
  /* each drop is a journal line, divided by the album's dashed rule */
  .entry {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.5rem 0.3rem;
    border-bottom: 1.5px dashed #cdbf9d;
  }
  .entry:last-child { border-bottom: none; }
  .entry:hover { background: rgba(255, 255, 255, 0.35); }

  .entry-cat {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    object-fit: contain;
    filter:
      drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff)
      drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)
      drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
  }
  .entry-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.1rem;
  }
  .entry-task {
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-weight: 600;
    font-size: 0.9rem;
    color: #5a4a2c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .entry-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: #8a7747;
    text-transform: capitalize;
  }
  .who-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--pc);
    flex-shrink: 0;
  }
  .date-edit {
    margin-top: 0.15rem;
    align-self: flex-start;
    font-size: 0.78rem;
    padding: 0.15rem 0.4rem;
    border: 1px solid #cdbf9d;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.6);
    color: #5a4a2c;
    font-family: inherit;
  }
  .btn-row-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: #a08a5a;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition: all 150ms;
  }
  .entry:hover .btn-row-action,
  .entry.editing .btn-row-action { opacity: 1; }
  .btn-row-action:hover { background: rgba(138, 119, 71, 0.16); color: #5a4a2c; }
  .btn-row-action.danger:hover { color: var(--nord11); background: rgba(191, 97, 106, 0.1); }
  .btn-row-action.save { color: var(--nord14); opacity: 1; }
  .btn-row-action.save:hover { background: rgba(163, 190, 140, 0.18); }

  .load-more {
    text-align: center;
    padding: 0.7rem;
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-size: 0.78rem;
    color: #9a865a;
  }
</style>
