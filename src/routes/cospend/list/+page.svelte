<script>
  import { onMount, onDestroy } from 'svelte';
  import { getShoppingSync } from '$lib/js/shoppingSync.svelte';
  import { SHOPPING_CATEGORIES } from '$lib/data/shoppingCategoryItems';
  import { Plus, ListX, Apple, Beef, Milk, Croissant, Wheat, FlameKindling, GlassWater, Candy, Snowflake, SprayCan, Sparkles, Package, Search, Store } from '@lucide/svelte';
  import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
  import { flip } from 'svelte/animate';
  import { slide } from 'svelte/transition';
  import { SvelteSet } from 'svelte/reactivity';
  import catalogData from '$lib/data/shoppingCatalog.json';
  import iconCategoriesData from '$lib/data/shoppingIconCategories.json';

  import { Share2, X, Copy, Check } from '@lucide/svelte';

  let { data } = $props();
  let user = $derived(data.session?.user?.nickname || 'guest');
  let shareToken = $derived(data.shareToken);
  let isGuest = $derived(!data.session);
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

  /** @type {Record<string, string[]>} */
  const STORE_PRESETS = {
    'Coop Max-Bill Platz': [
      'Haushalt', 'Hygiene & Körperpflege', 'Gewürze & Saucen', 'Süßes & Snacks',
      'Getränke', 'Pasta, Reis & Getreide', 'Brot & Backwaren', 'Milchprodukte',
      'Obst & Gemüse', 'Fleisch & Fisch', 'Tiefkühl', 'Sonstiges',
    ],
    'Migros Seebach': [
      'Obst & Gemüse', 'Fleisch & Fisch', 'Milchprodukte', 'Süßes & Snacks',
      'Getränke', 'Brot & Backwaren', 'Gewürze & Saucen', 'Haushalt',
      'Hygiene & Körperpflege', 'Tiefkühl', 'Pasta, Reis & Getreide', 'Sonstiges',
    ],
  };
  const STORE_NAMES = Object.keys(STORE_PRESETS);

  let selectedStore = $state(
    (typeof localStorage !== 'undefined' && localStorage.getItem('shopping-store')) || STORE_NAMES[0]
  );
  let categoryOrder = $derived(STORE_PRESETS[selectedStore] || STORE_PRESETS[STORE_NAMES[0]]);

  function setStore(name) {
    selectedStore = name;
    localStorage.setItem('shopping-store', name);
  }

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

    const ordered = categoryOrder
      .filter(cat => groups.has(cat))
      .map(cat => ({ category: cat, items: groups.get(cat) }));

    for (const [cat, items] of groups) {
      if (!categoryOrder.includes(cat)) {
        ordered.push({ category: cat, items });
      }
    }

    return ordered;
  });

  let checkedCount = $derived(sync.items.filter(i => i.checked).length);
  let totalCount = $derived(sync.items.length);

  onMount(() => { sync.init(shareToken); });
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
      const res = await fetch(sync.apiUrl('/api/cospend/list/categorize'), {
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

  // --- Long press edit ---

  /** @type {number | null} */
  let longPressTimer = $state(null);
  /** @type {import('$lib/js/shoppingSync.svelte').ShoppingItem | null} */
  let editingItem = $state(null);
  let editCategory = $state('');
  let editIcon = $state('');
  let iconSearch = $state('');
  let editSaving = $state(false);

  const allIcons = Object.entries(/** @type {Record<string, string>} */ (catalogData));
  const iconCategories = /** @type {Record<string, string>} */ (iconCategoriesData);

  /** Icons grouped by category, ordered by SHOPPING_CATEGORIES */
  const iconsByCategory = (() => {
    /** @type {Map<string, [string, string][]>} */
    const groups = new Map();
    for (const cat of SHOPPING_CATEGORIES) groups.set(cat, []);
    for (const [name, file] of allIcons) {
      const cat = iconCategories[name] || 'Sonstiges';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)?.push([name, file]);
    }
    return [...groups.entries()].filter(([, icons]) => icons.length > 0);
  })();

  let filteredIconGroups = $derived(
    iconSearch.trim()
      ? iconsByCategory
          .map(([cat, icons]) => /** @type {[string, [string,string][]]} */ ([cat, icons.filter(([name]) => name.includes(iconSearch.toLowerCase()))]))
          .filter(([, icons]) => icons.length > 0)
      : iconsByCategory
  );

  /** @param {import('$lib/js/shoppingSync.svelte').ShoppingItem} item */
  function startLongPress(item) {
    longPressTimer = window.setTimeout(() => {
      editingItem = item;
      editCategory = item.category;
      editIcon = item.icon || '';
      iconSearch = '';
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function closeEdit() {
    editingItem = null;
    editSaving = false;
  }

  // --- Share links ---
  let showShareModal = $state(false);
  /** @type {{ id: string, token: string, expiresAt: string, createdBy: string, createdAt: string }[]} */
  let shareTokens = $state([]);
  let shareLoading = $state(false);
  /** @type {string | null} */
  let copiedId = $state(null);
  let showCopyToast = $state(false);

  async function openShareModal() {
    showShareModal = true;
    await loadShareTokens();
  }

  async function loadShareTokens() {
    shareLoading = true;
    try {
      const res = await fetch('/api/cospend/list/share');
      if (res.ok) shareTokens = await res.json();
    } catch (err) {
      console.error('[shopping] Load tokens error:', err);
    } finally {
      shareLoading = false;
    }
  }

  /** @param {string} expiresAt */
  function formatTTL(expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'abgelaufen';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} Min.`;
    const hours = Math.round(diff / 3600000);
    if (hours < 24) return `${hours} Std.`;
    const days = Math.round(diff / 86400000);
    return `${days} Tag${days > 1 ? 'e' : ''}`;
  }

  const TTL_OPTIONS = [
    { label: '1 Stunde', ms: 1 * 60 * 60 * 1000 },
    { label: '6 Stunden', ms: 6 * 60 * 60 * 1000 },
    { label: '24 Stunden', ms: 24 * 60 * 60 * 1000 },
    { label: '3 Tage', ms: 3 * 24 * 60 * 60 * 1000 },
    { label: '7 Tage', ms: 7 * 24 * 60 * 60 * 1000 },
  ];

  /**
   * @param {string} id
   * @param {Event} e
   */
  function onTTLChange(id, e) {
    const ms = Number(/** @type {HTMLSelectElement} */ (e.currentTarget).value);
    const newExpiry = new Date(Date.now() + ms).toISOString();
    updateTokenExpiry(id, newExpiry);
  }

  async function createNewToken() {
    try {
      const res = await fetch('/api/cospend/list/share', { method: 'POST' });
      if (res.ok) await loadShareTokens();
    } catch (err) {
      console.error('[shopping] Create token error:', err);
    }
  }

  /** @param {{ id: string, token: string }} t */
  async function copyTokenLink(t) {
    const url = new URL('/cospend/list', window.location.origin);
    url.searchParams.set('token', t.token);
    await navigator.clipboard.writeText(url.toString());
    copiedId = t.id;
    showCopyToast = true;
    setTimeout(() => { copiedId = null; showCopyToast = false; }, 2000);
  }

  /** @param {string} id */
  async function deleteToken(id) {
    try {
      await fetch('/api/cospend/list/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      shareTokens = shareTokens.filter(t => t.id !== id);
    } catch (err) {
      console.error('[shopping] Delete token error:', err);
    }
  }

  /**
   * @param {string} id
   * @param {string} newExpiry - ISO date string
   */
  async function updateTokenExpiry(id, newExpiry) {
    try {
      await fetch('/api/cospend/list/share', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expiresAt: newExpiry })
      });
      shareTokens = shareTokens.map(t =>
        t.id === id ? { ...t, expiresAt: newExpiry } : t
      );
    } catch (err) {
      console.error('[shopping] Update token error:', err);
    }
  }

  async function saveEdit() {
    if (!editingItem) return;
    editSaving = true;
    const cleanName = parseQuantity(editingItem.name).name;
    try {
      await fetch(sync.apiUrl('/api/cospend/list/categorize/override'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, category: editCategory, icon: editIcon || null })
      });
      sync.updateItemCategory(editingItem.id, editCategory, editIcon || null);
      closeEdit();
    } catch (err) {
      console.error('[shopping] Save override error:', err);
      editSaving = false;
    }
  }

</script>

<div class="shopping-page">
  <header class="page-header">
    <div class="header-row">
      <h1>Einkaufsliste <SyncIndicator status={sync.status} /></h1>
      {#if !isGuest}
        <button class="btn-share" onclick={openShareModal} title="Teilen">
          <Share2 size={16} />
        </button>
      {/if}
    </div>
    {#if totalCount > 0}
      <p class="subtitle">{checkedCount} / {totalCount} erledigt</p>
    {/if}
    <div class="store-picker">
      <Store size={13} />
      {#each STORE_NAMES as name}
        <button
          class="store-btn"
          class:active={selectedStore === name}
          onclick={() => setStore(name)}
        >{name}</button>
      {/each}
    </div>
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
              <span class="category-count">{group.items.filter(i => !i.checked).length}</span>
            </div>
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
                  onpointerdown={() => startLongPress(item)}
                  onpointerup={cancelLongPress}
                  onpointerleave={cancelLongPress}
                  oncontextmenu={(e) => e.preventDefault()}
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

</div>

{#if editingItem}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="edit-backdrop" onclick={closeEdit}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="edit-modal" onclick={(e) => e.stopPropagation()}>
      <h3>{parseQuantity(editingItem.name).name}</h3>

      <label class="edit-label">Kategorie</label>
      <div class="category-picker">
        {#each SHOPPING_CATEGORIES as cat}
          {@const meta = categoryMeta[cat] || categoryMeta['Sonstiges']}
          {@const CatIcon = meta.icon}
          <button
            class="cat-option"
            class:selected={editCategory === cat}
            style="--cat-color: {meta.color}"
            onclick={() => { editCategory = cat; }}
          >
            <CatIcon size={14} />
            <span>{cat}</span>
          </button>
        {/each}
      </div>

      <label class="edit-label">Icon</label>
      <div class="icon-search">
        <Search size={14} />
        <input bind:value={iconSearch} type="text" placeholder="Icon suchen..." />
      </div>
      <div class="icon-picker">
        {#each filteredIconGroups as [cat, icons]}
          {@const meta = categoryMeta[cat] || categoryMeta['Sonstiges']}
          <div class="icon-group">
            <span class="icon-group-label" style="color: {meta.color}">{cat}</span>
            <div class="icon-group-grid">
              {#each icons as [name, file]}
                <button
                  class="icon-option"
                  class:selected={editIcon === file}
                  onclick={() => { editIcon = file; }}
                  title={name}
                >
                  <img src="https://bocken.org/static/shopping-icons/{file}.png" alt={name} />
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="edit-actions">
        <button class="btn-cancel" onclick={closeEdit}>Abbrechen</button>
        <button class="btn-save" onclick={saveEdit} disabled={editSaving}>
          {editSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showShareModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="edit-backdrop" onclick={() => { showShareModal = false; }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="edit-modal share-modal" onclick={(e) => e.stopPropagation()}>
      <div class="share-header">
        <h3>Geteilte Links</h3>
        <button class="close-button" onclick={() => { showShareModal = false; }}>
          <X size={18} />
        </button>
      </div>
      <p class="share-desc">Jeder mit einem aktiven Link kann die Einkaufsliste bearbeiten.</p>

      {#if shareLoading}
        <p class="share-loading">Laden...</p>
      {:else if shareTokens.length === 0}
        <p class="share-empty">Keine aktiven Links.</p>
      {:else}
        <div class="token-list">
          {#each shareTokens as t (t.id)}
            <div class="token-item">
              <div class="token-info">
                <span class="token-created-by">{t.createdBy}</span>
                <div class="token-expiry-row">
                  <span class="token-ttl">noch {formatTTL(t.expiresAt)}</span>
                  <select class="token-ttl-select" onchange={(e) => onTTLChange(t.id, e)}>
                    <option value="" disabled selected>Ändern</option>
                    {#each TTL_OPTIONS as opt}
                      <option value={opt.ms}>{opt.label}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <div class="token-actions">
                <button class="btn-token-copy" onclick={() => copyTokenLink(t)} title="Link kopieren">
                  {#if copiedId === t.id}<Check size={14} />{:else}<Copy size={14} />{/if}
                </button>
                <button class="btn-token-delete" onclick={() => deleteToken(t.id)} title="Löschen">
                  <X size={14} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <button class="btn-new-token" onclick={createNewToken}>
        <Plus size={14} />
        Neuen Link erstellen
      </button>
    </div>
  </div>
{/if}

{#if showCopyToast}
  <div class="copy-toast" transition:slide={{ duration: 150 }}>
    <Check size={14} /> Kopiert
  </div>
{/if}

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
  .header-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  .btn-share {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 8px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-share:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-primary);
  }
  .subtitle {
    margin: 0.25rem 0 0;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }
  .store-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    margin-top: 0.5rem;
    color: var(--color-text-secondary);
  }
  .store-btn {
    padding: 0.2rem 0.5rem;
    border-radius: 100px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 150ms;
  }
  .store-btn:hover {
    border-color: var(--nord10);
    color: var(--color-text-primary);
  }
  .store-btn.active {
    background: var(--nord10);
    color: white;
    border-color: var(--nord10);
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
    opacity: 0.35;
    background: color-mix(in srgb, var(--nord14) 8%, var(--color-surface));
  }
  .item-card.checked::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top right,
      transparent calc(50% - 1px),
      var(--color-text-secondary) calc(50% - 1px),
      var(--color-text-secondary) calc(50% + 1px),
      transparent calc(50% + 1px)
    );
    border-radius: 12px;
    pointer-events: none;
    opacity: 0.5;
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

  /* Edit modal */
  .edit-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .edit-modal {
    background: var(--color-bg-secondary);
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  .edit-modal h3 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }
  .edit-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .category-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
  }
  .cat-option {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-size: 0.72rem;
    cursor: pointer;
    transition: all 150ms;
  }
  .cat-option:hover {
    border-color: var(--cat-color);
  }
  .cat-option.selected {
    background: var(--cat-color);
    color: var(--nord0);
    border-color: var(--cat-color);
  }

  .icon-search {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }
  .icon-search input {
    border: none;
    background: none;
    color: var(--color-text-primary);
    font-size: 0.85rem;
    flex: 1;
    outline: none;
  }

  .icon-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 250px;
    overflow-y: auto;
    margin-bottom: 1.25rem;
    padding: 0.25rem;
  }
  .icon-group-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .icon-group-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    gap: 0.3rem;
  }
  .icon-option {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 2px solid transparent;
    background: var(--color-bg-tertiary);
    cursor: pointer;
    padding: 0.25rem;
    transition: all 150ms;
  }
  .icon-option:hover {
    border-color: var(--color-border);
  }
  .icon-option.selected {
    border-color: var(--nord10);
    background: color-mix(in srgb, var(--nord10) 15%, var(--color-bg-tertiary));
  }
  .icon-option img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .btn-cancel, .btn-save {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    border: none;
    transition: all 150ms;
  }
  .btn-cancel {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }
  .btn-cancel:hover {
    background: var(--color-bg-elevated);
  }
  .btn-save {
    background: var(--nord10);
    color: white;
  }
  .btn-save:hover {
    background: var(--nord9);
  }
  .btn-save:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* Share modal */
  .share-modal {
    max-width: 440px;
  }
  .share-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .share-header h3 {
    margin: 0;
  }
  .close-button {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
    display: flex;
  }
  .close-button:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
  }
  .share-desc {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin: 0 0 1rem;
  }
  .share-loading, .share-empty {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-align: center;
    padding: 1rem 0;
    margin: 0;
  }
  .token-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .token-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background: var(--color-bg-tertiary);
    border-radius: 10px;
  }
  .token-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .token-created-by {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .token-expiry-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .token-ttl {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  .token-ttl-select {
    font-size: 0.68rem;
    padding: 0.1rem 0.25rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .token-actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .btn-token-copy {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-token-copy:hover {
    color: var(--nord10);
    background: color-mix(in srgb, var(--nord10) 10%, transparent);
  }
  .btn-token-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-token-delete:hover {
    color: var(--nord11);
    background: color-mix(in srgb, var(--nord11) 10%, transparent);
  }
  .btn-new-token {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    width: 100%;
    padding: 0.5rem;
    border: 1px dashed var(--color-border);
    border-radius: 10px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 150ms;
  }
  .btn-new-token:hover {
    color: var(--nord10);
    border-color: var(--nord10);
    background: color-mix(in srgb, var(--nord10) 5%, transparent);
  }

  .copy-toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.8rem;
    border-radius: 100px;
    background: var(--nord14);
    color: var(--nord0);
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 200;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 500px) {
    .edit-backdrop { padding: 0.5rem; }
    .edit-modal { padding: 1rem 0.75rem; }
  }
</style>
