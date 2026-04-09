<script>
  import { invalidateAll } from '$app/navigation';
  import { confirm } from '$lib/js/confirmDialog.svelte';
  import { STICKERS, getStickerById, getRarityColor } from '$lib/utils/stickers';
  import { formatDistanceToNow } from 'date-fns';
  import { de } from 'date-fns/locale';
  import { scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { Trash2 } from '@lucide/svelte';
  import StickerCalendar from '$lib/components/tasks/StickerCalendar.svelte';
  import StickerPopup from '$lib/components/tasks/StickerPopup.svelte';

  let { data } = $props();

  /** @type {import('$lib/utils/stickers').Sticker | null} */
  let selectedSticker = $state(null);

  let stats = $derived(data.stats || { userStats: [], userStickers: [], recentCompletions: [] });
  let currentUser = $derived(data.session?.user?.nickname || '');

  const rarityLabels = /** @type {Record<string, string>} */ ({
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    legendary: 'Legendär'
  });

  const rarityOrder = /** @type {Record<string, number>} */ ({
    legendary: 0,
    rare: 1,
    uncommon: 2,
    common: 3
  });

  // Build current user's sticker collection
  let displayedStickers = $derived.by(() => {
    /** @type {Map<string, number>} */
    const collection = new Map();
    for (const entry of stats.userStickers) {
      if (entry._id.user === currentUser) {
        collection.set(entry._id.sticker, entry.count);
      }
    }
    return collection;
  });

  // Sort stickers for display: owned first (by rarity), then unowned
  let sortedStickers = $derived.by(() => {
    return [...STICKERS].sort((a, b) => {
      const aOwned = displayedStickers.has(a.id);
      const bOwned = displayedStickers.has(b.id);
      if (aOwned && !bOwned) return -1;
      if (!aOwned && bOwned) return 1;
      const rarityDiff = (rarityOrder[a.rarity] ?? 3) - (rarityOrder[b.rarity] ?? 3);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'de');
    });
  });

  let collectedCount = $derived(displayedStickers.size);
  let totalCount = STICKERS.length;

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

  async function clearHistory() {
    if (!await confirm('Deinen gesamten Verlauf und alle Sticker wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const res = await fetch('/api/tasks/stats', { method: 'DELETE' });
    if (res.ok) await invalidateAll();
  }
</script>

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
  <div class="sticker-grid">
    {#each sortedStickers as sticker (sticker.id)}
      {@const count = displayedStickers.get(sticker.id) || 0}
      {@const owned = count > 0}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="sticker-card"
        class:owned
        class:locked={!owned}
        animate:flip={{ duration: 300 }}
        style="--rarity-color: {getRarityColor(sticker.rarity)}"
        onclick={() => owned && (selectedSticker = sticker)}
      >
        <div class="sticker-visual">
          {#if owned}
            <img class="sticker-img" src="/stickers/{sticker.image}" alt={sticker.name} />
          {:else}
            <span class="sticker-unknown">?</span>
          {/if}
          {#if count > 1}
            <span class="sticker-count">x{count}</span>
          {/if}
        </div>
        <div class="sticker-info">
          <span class="sticker-name">{owned ? sticker.name : '???'}</span>
          <span class="sticker-rarity" style="color: {getRarityColor(sticker.rarity)}">
            {rarityLabels[sticker.rarity]}
          </span>
          {#if owned}
            <span class="sticker-desc">{sticker.description}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if recentWithStickers.length > 0}
    <section class="recent-section">
      <h2>Letzte Sticker</h2>
      <div class="recent-list">
        {#each recentWithStickers as completion}
          {@const sticker = getStickerById(completion.stickerId)}
          {#if sticker}
            <div class="recent-item">
              <img class="recent-img" src="/stickers/{sticker.image}" alt={sticker.name} />
              <div class="recent-info">
                <span class="recent-task">{completion.taskTitle}</span>
                <span class="recent-meta">
                  {completion.completedBy} &middot; {formatDistanceToNow(new Date(completion.completedAt), { locale: de, addSuffix: true })}
                </span>
              </div>
              {#if completion.completedBy === currentUser}
                <button class="btn-delete-completion" title="Eintrag löschen" onclick={() => deleteCompletion(completion._id)}>
                  <Trash2 size={14} />
                </button>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedSticker}
    <StickerPopup sticker={selectedSticker} title={selectedSticker.name} buttonText="Schließen" bounce={false} onclose={() => selectedSticker = null} />
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
    max-width: 900px;
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
    margin: 0 0 0.75rem;
  }

  /* Sticker grid */
  .sticker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .sticker-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem 0.5rem;
    border-radius: 14px;
    border: 1px solid var(--color-border, #e8e4dd);
    background: var(--color-bg-primary, white);
    transition: transform 150ms, box-shadow 150ms;
  }
  .sticker-card.owned {
    border-color: var(--rarity-color);
    border-width: 1.5px;
    cursor: pointer;
  }
  .sticker-card.owned:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .sticker-card.locked {
    opacity: 0.4;
    filter: grayscale(0.8);
  }

  .sticker-visual {
    position: relative;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.4rem;
  }
  .owned .sticker-visual {
    background: radial-gradient(circle, var(--rarity-color) 0%, transparent 70%);
    border-radius: 50%;
    opacity: 0.95;
  }
  .sticker-img {
    width: 52px;
    height: 52px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
  }
  .sticker-unknown {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-text-secondary, #ccc);
    opacity: 0.4;
  }
  .sticker-count {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: var(--nord10);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    border-radius: 100px;
    line-height: 1.2;
  }

  .sticker-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .sticker-name {
    font-size: 0.78rem;
    font-weight: 600;
  }
  .sticker-rarity {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sticker-desc {
    font-size: 0.68rem;
    color: var(--color-text-secondary, #999);
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
  .btn-delete-completion {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-left: auto;
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--color-text-secondary, #ccc);
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition: all 150ms;
  }
  .recent-item:hover .btn-delete-completion { opacity: 1; }
  .btn-delete-completion:hover {
    color: var(--nord11);
    background: rgba(191, 97, 106, 0.08);
  }
  .recent-img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
  .recent-info {
    display: flex;
    flex-direction: column;
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
    :global(:root:not([data-theme="light"])) .sticker-card {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .sticker-card.owned {
      border-color: var(--rarity-color);
    }
    :global(:root:not([data-theme="light"])) .recent-item {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .progress-bar {
      background: var(--nord2);
    }
  }
  :global(:root[data-theme="dark"]) .sticker-card {
    background: var(--nord1);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .sticker-card.owned {
    border-color: var(--rarity-color);
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

  @media (max-width: 600px) {
    .sticker-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 0.5rem;
    }
    .sticker-card { padding: 0.7rem 0.3rem; }
    h1 { font-size: 1.3rem; }
  }
</style>
