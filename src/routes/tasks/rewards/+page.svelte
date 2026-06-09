<script>
  import { invalidateAll } from '$app/navigation';
  import { confirm } from '$lib/js/confirmDialog.svelte';
  import { STICKERS, getStickerById, getDropChance, ALWAYS_CATEGORIES, getTagsForCategory } from '$lib/utils/stickers';
  import { formatDistanceToNow, format } from 'date-fns';
  import { de } from 'date-fns/locale';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Wind from '@lucide/svelte/icons/wind';
  import Brush from '@lucide/svelte/icons/brush';
  import Bath from '@lucide/svelte/icons/bath';
  import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
  import CookingPot from '@lucide/svelte/icons/cooking-pot';
  import Droplets from '@lucide/svelte/icons/droplets';
  import WashingMachine from '@lucide/svelte/icons/washing-machine';
  import Shirt from '@lucide/svelte/icons/shirt';
  import Flower2 from '@lucide/svelte/icons/flower-2';
  import Leaf from '@lucide/svelte/icons/leaf';
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
  import StickerCalendar from '$lib/components/tasks/StickerCalendar.svelte';
  import VinylSticker from '$lib/components/tasks/VinylSticker.svelte';
  import VinylStickerCard from '$lib/components/tasks/VinylStickerCard.svelte';

  let { data } = $props();

  /** @type {import('$lib/utils/stickers').Sticker | null} */
  let selected = $state(null);

  let stats = $derived(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');

  // id -> times earned (current user)
  let counts = $derived.by(() => {
    /** @type {Map<string, number>} */
    const m = new Map();
    for (const entry of stats.userStickers) {
      if (entry._id.user === currentUser) m.set(entry._id.sticker, entry.count);
    }
    return m;
  });

  // album "pages" by category
  const PAGES = [
    { cat: 'general', name: 'Allerlei' },
    { cat: 'kitchen', name: 'Küche' },
    { cat: 'cozy', name: 'Gemütlichkeit' },
    { cat: 'plants', name: 'Pflanzen & Garten' },
    { cat: 'cleaning', name: 'Sauberkeit' },
    { cat: 'errands', name: 'Erledigungen' },
    { cat: 'achievement', name: 'Erfolge' },
    { cat: 'special', name: 'Besonderes' }
  ];
  const rarityRank = /** @type {Record<string, number>} */ ({ legendary: 0, rare: 1, uncommon: 2, common: 3 });
  let pages = $derived(
    PAGES.map((p) => {
      const items = STICKERS.filter((s) => s.category === p.cat).sort(
        (a, b) => (rarityRank[a.rarity] ?? 9) - (rarityRank[b.rarity] ?? 9) || a.name.localeCompare(b.name, 'de')
      );
      // category rank = average sticker rarity (lower = rarer -> higher up);
      // 'general' is the catch-all bucket, so it always sinks to the bottom
      const avg = items.reduce((sum, s) => sum + (rarityRank[s.rarity] ?? 9), 0) / (items.length || 1);
      const score = p.cat === 'general' ? 99 : avg;
      const always = ALWAYS_CATEGORIES.includes(p.cat);
      const tags = always ? [] : getTagsForCategory(p.cat);
      return { ...p, items, score, always, tags, owned: items.filter((s) => counts.has(s.id)).length };
    }).sort((a, b) => a.score - b.score)
  );

  // id -> { first earned label, source task } (recentCompletions is newest-first)
  let info = $derived.by(() => {
    /** @type {Map<string, { first: string, task: string }>} */
    const m = new Map();
    for (const c of stats.recentCompletions || []) {
      if (c.completedBy !== currentUser || !c.stickerId) continue;
      m.set(c.stickerId, {
        first: format(new Date(c.completedAt), 'd. MMM yyyy', { locale: de }),
        task: c.taskTitle || ''
      });
    }
    return m;
  });

  let collectedCount = $derived(counts.size);
  let totalCount = STICKERS.length;

  let openInfo = $state('');

  // same tag icons as the /tasks page
  /** @type {Record<string, any>} */
  const TAG_ICONS = {
    putzen: Sparkles, saugen: Wind, wischen: Brush, bad: Bath,
    küche: UtensilsCrossed, kochen: CookingPot, abwasch: Droplets,
    wäsche: WashingMachine, bügeln: Shirt,
    pflanzen: Flower2, gießen: Droplets, düngen: Leaf, garten: Leaf,
    einkaufen: ShoppingCart, müll: Trash2
  };

  // Recent completions with stickers
  let recentWithStickers = $derived(
    stats.recentCompletions
      .filter((/** @type {any} */ c) => c.stickerId)
      .filter((/** @type {any} */ c) => !currentUser || c.completedBy === currentUser)
      .slice(0, 20)
  );

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

  async function clearHistory() {
    if (!await confirm('Deinen gesamten Verlauf und alle Sticker wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const res = await fetch('/api/tasks/stats', { method: 'DELETE' });
    if (res.ok) await invalidateAll();
  }
</script>

<svelte:head><title>Sticker-Sammlung - Bocken</title></svelte:head>

<div class="rewards-page">
  <header class="page-header">
    <h1>Sticker-Sammlung</h1>
    <p class="subtitle">{collectedCount} / {totalCount} gesammelt</p>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {(collectedCount / totalCount) * 100}%"></div>
    </div>
  </header>

  <StickerCalendar completions={stats.recentCompletions} {currentUser} />

  <h2 class="section-title">Alle Sticker</h2>
  {#each pages as page (page.cat)}
    <section class="page">
      <div class="page-head">
        <div class="ph-title">
          <h3>{page.name}</h3>
          <button
            class="info-btn"
            class:open={openInfo === page.cat}
            aria-label="Wie bekomme ich diese Sticker?"
            aria-expanded={openInfo === page.cat}
            onclick={() => (openInfo = openInfo === page.cat ? '' : page.cat)}
          >i</button>
        </div>
        <span class="page-count">{page.owned}/{page.items.length}</span>
      </div>
      {#if openInfo === page.cat}
        <p class="earn-info">
          {#if page.always}
            Diese Kätzchen können bei <strong>jeder erledigten Aufgabe</strong> auftauchen.
          {:else}
            Tauchen bei Aufgaben mit diesen Tags auf:
            <span class="tags">
              {#each page.tags as t (t)}
                {@const Icon = TAG_ICONS[t]}
                <span class="tag">{#if Icon}<Icon size={13} strokeWidth={1.8} />{/if}{t}</span>
              {/each}
            </span>
          {/if}
        </p>
      {/if}
      <div class="sheet">
        {#each page.items as sticker (sticker.id)}
          <VinylSticker
            {sticker}
            owned={counts.has(sticker.id)}
            count={counts.get(sticker.id) || 0}
            onpick={(/** @type {any} */ s) => (selected = s)}
          />
        {/each}
      </div>
    </section>
  {/each}

  {#if recentWithStickers.length > 0}
    <section class="recent-section">
      <h2>Letzte Sticker</h2>
      <div class="recent-list">
        {#each recentWithStickers as completion (completion._id)}
          {@const sticker = getStickerById(completion.stickerId)}
          {#if sticker}
            <div class="recent-item" class:editing={editingId === completion._id}>
              <img class="recent-img" src="/stickers/{sticker.image}" alt={sticker.name} />
              <div class="recent-info">
                <span class="recent-task">{completion.taskTitle}</span>
                {#if editingId === completion._id}
                  <input
                    class="date-edit"
                    type="datetime-local"
                    bind:value={editValue}
                    aria-label="Datum bearbeiten"
                  />
                {:else}
                  <span class="recent-meta">
                    {completion.completedBy} &middot; {formatDistanceToNow(new Date(completion.completedAt), { locale: de, addSuffix: true })}
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

  <div class="danger-zone">
    <button class="btn-clear" onclick={clearHistory}>
      <Trash2 size={14} />
      Verlauf löschen
    </button>
  </div>
</div>

<style>
  .rewards-page {
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
  .subtitle {
    margin: 0.25rem 0 0.75rem;
    color: var(--color-text-secondary, #888);
    font-size: 0.9rem;
  }

  .progress-bar {
    width: 100%;
    max-width: 400px;
    height: 8px;
    background: var(--color-bg-secondary, #e8e4dd);
    border-radius: 100px;
    margin: 0 auto 1rem;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--nord14), var(--nord13));
    border-radius: 100px;
    transition: width 500ms ease;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
  }

  /* sticker album pages */
  .page {
    margin-bottom: 1.25rem;
    padding: 1rem 1rem 1.25rem;
    border-radius: var(--radius-lg);
    background-color: #f3ecd9;
    background-image: radial-gradient(rgba(120, 100, 70, 0.16) 1px, transparent 1.4px);
    background-size: 18px 18px;
    border: 1px solid #e4d9be;
    box-shadow: var(--shadow-sm), inset 0 0 40px rgba(150, 130, 90, 0.08);
  }
  .page-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 0.5rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px dashed #cdbf9d;
  }
  .page-head h3 {
    margin: 0;
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-weight: 600;
    font-size: 1.1rem;
    color: #5a4a2c;
  }
  .ph-title { display: flex; align-items: center; gap: 0.45rem; }
  .info-btn {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid #b9a877;
    background: transparent;
    color: #8a7747;
    border-radius: 50%;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: all 120ms;
  }
  .info-btn:hover, .info-btn.open {
    background: #8a7747;
    color: #f3ecd9;
    border-color: #8a7747;
  }
  .page-count {
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    color: #8a7747;
  }
  .earn-info {
    margin: 0 0 0.7rem;
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
    line-height: 1.5;
    color: #5a4a2c;
    background: rgba(255, 255, 255, 0.55);
    border: 1px dashed #cdbf9d;
    border-radius: var(--radius-md);
  }
  .earn-info strong { color: #5a4a2c; }
  .tags { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; vertical-align: middle; }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.08rem 0.5rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #6a5a3a;
    background: color-mix(in srgb, var(--nord14) 22%, #fff);
    border: 1px solid color-mix(in srgb, var(--nord14) 45%, transparent);
    border-radius: var(--radius-pill);
  }
  .sheet {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 0.4rem 0.2rem;
  }
  /* the album sheet is a physical page — stays warm in dark mode */
  :global(:root[data-theme='dark']) .page,
  :global(:root:not([data-theme='light'])) .page {
    background-color: #ece3cb;
  }

  /* Recent section */
  .recent-section {
    margin-top: 2.5rem;
  }
  .recent-section h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
  }
  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .recent-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #e8e4dd);
    border-radius: 10px;
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
    color: var(--color-text-secondary, #aaa);
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition: all 150ms;
  }
  .recent-item:hover .btn-row-action,
  .recent-item.editing .btn-row-action { opacity: 1; }
  .btn-row-action:hover { background: var(--color-bg-secondary, #f0ede6); color: var(--color-text-primary, #333); }
  .btn-row-action.danger:hover { color: var(--nord11); background: rgba(191, 97, 106, 0.08); }
  .btn-row-action.save { color: var(--nord14); opacity: 1; }
  .btn-row-action.save:hover { background: rgba(163, 190, 140, 0.14); }
  .recent-img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
  .recent-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .date-edit {
    margin-top: 0.2rem;
    align-self: flex-start;
    font-size: 0.78rem;
    padding: 0.15rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-family: inherit;
  }
  .recent-task {
    font-size: 0.82rem;
    font-weight: 500;
  }
  .recent-meta {
    font-size: 0.7rem;
    color: var(--color-text-secondary, #aaa);
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .recent-item {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .progress-bar {
      background: var(--nord2);
    }
  }
  :global(:root[data-theme="dark"]) .recent-item {
    background: var(--nord1);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .progress-bar {
    background: var(--nord2);
  }

  .danger-zone {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border, #e8e4dd);
    display: flex;
    justify-content: center;
  }
  .btn-clear {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary, #999);
    background: transparent;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 8px;
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-clear:hover {
    color: var(--nord11);
    border-color: var(--nord11);
    background: rgba(191, 97, 106, 0.06);
  }
</style>
