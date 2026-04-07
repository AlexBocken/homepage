<script>
  import { onMount, onDestroy } from 'svelte';
  import { getShoppingSync } from '$lib/js/shoppingSync.svelte';
  import { SHOPPING_CATEGORIES } from '$lib/data/shoppingCategoryItems';
  import { Plus, ListX, Apple, Beef, Milk, Croissant, Wheat, FlameKindling, GlassWater, Candy, Snowflake, SprayCan, Sparkles, Package } from '@lucide/svelte';
  import { flip } from 'svelte/animate';
  import { slide } from 'svelte/transition';
  import { SvelteSet } from 'svelte/reactivity';

  let { data } = $props();
  let user = $derived(data.session?.user?.nickname || '');
  const sync = getShoppingSync();

  /** @type {Record<string, { icon: typeof Plus, color: string }>} */
  const categoryMeta = {
    'Obst & Gemüse':          { icon: Apple, color: 'var(--nord14)' },
    'Fleisch & Fisch':        { icon: Beef, color: 'var(--nord11)' },
    'Milchprodukte':          { icon: Milk, color: 'var(--nord9)' },
    'Brot & Backwaren':       { icon: Croissant, color: 'var(--nord12)' },
    'Pasta, Reis & Getreide': { icon: Wheat, color: 'var(--nord13)' },
    'Gewürze & Saucen':       { icon: FlameKindling, color: 'var(--nord11)' },
    'Getränke':               { icon: GlassWater, color: 'var(--nord10)' },
    'Süßes & Snacks':         { icon: Candy, color: 'var(--nord15)' },
    'Tiefkühl':               { icon: Snowflake, color: 'var(--nord9)' },
    'Haushalt':               { icon: SprayCan, color: 'var(--nord8)' },
    'Hygiene & Körperpflege': { icon: Sparkles, color: 'var(--nord15)' },
    'Sonstiges':              { icon: Package, color: 'var(--nord4)' },
  };

  let newItemName = $state('');
  /** @type {HTMLInputElement | null} */
  let inputEl = $state(null);
  let categorizing = new SvelteSet();


  /**
   * Parse quantity + unit from item name.
   * "10L Milch" → { qty: "10L", name: "Milch" }
   * "3x Milch" → { qty: "3x", name: "Milch" }
   * "3 x Milch" → { qty: "3x", name: "Milch" }
   * "Milch, 3x" → { qty: "3x", name: "Milch" }
   * "Milch 3x" → { qty: "3x", name: "Milch" }
   * "500g Hackfleisch" → { qty: "500g", name: "Hackfleisch" }
   * "Milch" → { qty: null, name: "Milch" }
   * @param {string} raw
   * @returns {{ qty: string | null, name: string }}
   */
  function parseQuantity(raw) {
    // Trailing: "Milch, 3x" or "Milch 3x" or "Milch, 500g"
    const trailingMatch = raw.match(/^(.+?)[,\s]+(\d+\s*[xX×]|\d+(?:\.\d+)?\s*(?:L|l|kg|g|ml|mL|st|St|Stk|stk|Pkg|pkg))\s*$/);
    if (trailingMatch) {
      return { qty: trailingMatch[2].replace(/\s+/g, ''), name: trailingMatch[1].trim() };
    }

    // Leading: "3x Milch" or "3 x Milch" or "10L Milch" or "500g Hackfleisch"
    const leadingMatch = raw.match(/^(\d+(?:\.\d+)?\s*[xX×]|\d+(?:\.\d+)?\s*(?:L|l|kg|g|ml|mL|st|St|Stk|stk|Pkg|pkg)?)\s+(.+)$/);
    if (leadingMatch) {
      const qtyRaw = leadingMatch[1].replace(/\s+/g, '');
      // Only treat bare numbers as quantity if followed by text (avoid stripping "7up")
      if (/[xX×LlgkmsSPp]/.test(qtyRaw) || /^\d+$/.test(qtyRaw)) {
        return { qty: qtyRaw, name: leadingMatch[2].trim() };
      }
    }

    return { qty: null, name: raw };
  }

  /** Get icon URL for an item */
  function iconUrl(item) {
    if (item.icon) return `https://bocken.org/static/shopping-icons/${item.icon}.png`;
    // Fallback: first letter
    const letter = item.name.charAt(0).toLowerCase();
    if (letter >= 'a' && letter <= 'z') return `https://bocken.org/static/shopping-icons/${letter}.png`;
    return null;
  }

  // Group items by category, unchecked first within each group
  let groupedItems = $derived.by(() => {
    /** @type {Map<string, import('$lib/js/shoppingSync.svelte').ShoppingItem[]>} */
    const groups = new Map();

    for (const item of sync.items) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    }

    for (const [, items] of groups) {
      items.sort((a, b) => Number(a.checked) - Number(b.checked));
    }

    const ordered = [...SHOPPING_CATEGORIES]
      .filter(cat => groups.has(cat))
      .map(cat => ({ category: cat, items: groups.get(cat) }));

    for (const [cat, items] of groups) {
      if (!SHOPPING_CATEGORIES.includes(/** @type {any} */ (cat))) {
        ordered.push({ category: cat, items });
      }
    }

    return ordered;
  });

  let checkedCount = $derived(sync.items.filter(i => i.checked).length);
  let totalCount = $derived(sync.items.length);

  onMount(() => { sync.init(); });
  onDestroy(() => { sync.disconnect(); });

  async function addItem() {
    const name = newItemName.trim();
    if (!name) return;

    sync.addItem(name, user);
    newItemName = '';
    inputEl?.focus();

    const addedItem = sync.items[sync.items.length - 1];
    if (!addedItem) return;

    const itemId = addedItem.id;
    categorizing.add(itemId);

    try {
      const cleanName = parseQuantity(name).name;
      console.log(`[shopping] Categorizing "${cleanName}" (item ${itemId})...`);
      const res = await fetch('/api/cospend/list/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      });
      console.log(`[shopping] Categorize response: ${res.status}`);
      if (res.ok) {
        const { category, icon } = await res.json();
        console.log(`[shopping] Got category=${category}, icon=${icon}, updating item ${itemId}`);
        sync.updateItemCategory(itemId, category, icon);
      } else {
        console.warn(`[shopping] Categorize failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      console.error('[shopping] Categorize error:', err);
    }

    categorizing.delete(itemId);
  }

  /** @param {KeyboardEvent} e */
  function onKeydown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  }

</script>

<div class="shopping-page">
  <header class="page-header">
    <h1>Einkaufsliste</h1>
    {#if totalCount > 0}
      <p class="subtitle">{checkedCount} / {totalCount} erledigt</p>
    {/if}
  </header>

  <div class="add-bar">
    <input
      bind:this={inputEl}
      bind:value={newItemName}
      onkeydown={onKeydown}
      type="text"
      placeholder="Artikel hinzufügen..."
      autocomplete="off"
    />
    <button class="btn-add" onclick={addItem} disabled={!newItemName.trim()}>
      <Plus size={18} />
    </button>
  </div>

  {#if totalCount === 0}
    <p class="empty-state">Die Einkaufsliste ist leer</p>
  {:else}
    <div class="item-list">
      {#each groupedItems as group (group.category)}
        {@const meta = categoryMeta[group.category] || categoryMeta['Sonstiges']}
        {@const CategoryIcon = meta.icon}
        <section class="category-section" style="--cat-color: {meta.color}" transition:slide={{ duration: 200 }}>
          <div class="category-header">
            <div class="category-title">
              <div class="category-icon">
                <CategoryIcon size={14} />
              </div>
              <h2>{group.category}</h2>
            </div>
            <span class="category-count">{group.items.filter(i => !i.checked).length}</span>
          </div>

            <div class="card-grid">
              {#each group.items as item (item.id)}
                {@const parsed = parseQuantity(item.name)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="item-card"
                  class:checked={item.checked}
                  animate:flip={{ duration: 200 }}
                  onclick={() => sync.toggleItem(item.id, user)}
                >
                  {#if parsed.qty}
                    <span class="qty-badge">{parsed.qty}</span>
                  {/if}
                  <div class="card-icon">
                    {#if iconUrl(item)}
                      <img src={iconUrl(item)} alt="" />
                    {:else}
                      <span class="card-letter">{parsed.name.charAt(0)}</span>
                    {/if}
                  </div>
                  <span class="card-name">{parsed.name}</span>
                </div>
              {/each}
            </div>
        </section>
      {/each}
    </div>

    {#if checkedCount > 0}
      <button class="btn-clear-checked" onclick={() => sync.clearChecked()}>
        <ListX size={16} />
        Erledigte entfernen ({checkedCount})
      </button>
    {/if}
  {/if}

  {#if sync.status === 'offline'}
    <div class="status-badge offline">Offline</div>
  {:else if sync.status === 'syncing'}
    <div class="status-badge syncing">Synchronisiere...</div>
  {/if}
</div>

<style>
  .shopping-page {
    max-width: 700px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  .subtitle {
    margin: 0.25rem 0 0;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  /* Add bar */
  .add-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .add-bar input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-size: 0.9rem;
  }
  .add-bar input:focus {
    outline: none;
    border-color: var(--nord10);
  }
  .btn-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    border-radius: 10px;
    background: var(--nord10);
    color: white;
    cursor: pointer;
    transition: background 150ms;
    flex-shrink: 0;
  }
  .btn-add:hover { background: var(--nord9); }
  .btn-add:disabled { opacity: 0.4; cursor: default; }

  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-top: 3rem;
  }

  /* Categories */
  .item-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .category-section {
    overflow: hidden;
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.2rem;
    user-select: none;
  }
  .category-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .category-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 6px;
    color: var(--cat-color);
    background: color-mix(in srgb, var(--cat-color) 12%, transparent);
  }
  .category-header h2 {
    font-size: 0.78rem;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--cat-color);
  }
  .category-count {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--cat-color);
    background: color-mix(in srgb, var(--cat-color) 10%, var(--color-bg-tertiary));
    padding: 0.1rem 0.45rem;
    border-radius: 100px;
  }

  /* Card grid */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .item-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.6rem 0.3rem;
    border-radius: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: all 150ms;
    aspect-ratio: 1;
    user-select: none;
  }
  .item-card:hover {
    background: var(--color-bg-elevated);
  }
  .item-card:active {
    transform: scale(0.95);
  }
  .item-card.checked {
    opacity: 0.45;
    background: color-mix(in srgb, var(--nord14) 8%, var(--color-surface));
  }

  .card-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .card-icon img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .item-card.checked .card-icon {
    filter: grayscale(0.6);
  }

  .card-letter {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .card-name {
    font-size: 0.72rem;
    font-weight: 500;
    text-align: center;
    line-height: 1.2;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
  .item-card.checked .card-name {
    text-decoration: line-through;
    color: var(--color-text-secondary);
  }

  .qty-badge {
    position: absolute;
    top: 0.2rem;
    left: 0.2rem;
    background: var(--cat-color);
    color: var(--nord0);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.35rem;
    border-radius: 0.5rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  /* Clear checked */
  .btn-clear-checked {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    margin: 1.5rem auto 0;
    padding: 0.5rem 1.2rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-clear-checked:hover {
    color: var(--nord11);
    border-color: var(--nord11);
    background: color-mix(in srgb, var(--nord11) 6%, transparent);
  }

  /* Status */
  .status-badge {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.35rem 0.8rem;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 600;
    z-index: 50;
  }
  .status-badge.offline { background: var(--nord11); color: white; }
  .status-badge.syncing { background: var(--nord13); color: var(--nord0); }

  @media (max-width: 500px) {
    .shopping-page { padding: 1rem 0.75rem; }
    h1 { font-size: 1.3rem; }
    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.4rem;
    }
    .card-icon { width: 36px; height: 36px; }
    .card-name { font-size: 0.68rem; }
  }
</style>
