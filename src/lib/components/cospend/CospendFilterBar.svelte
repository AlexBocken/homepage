<script>
  import { slide } from 'svelte/transition';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import X from '@lucide/svelte/icons/x';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import ProfilePicture from './ProfilePicture.svelte';
  import { m } from '$lib/js/cospendI18n';

  let {
    /** Applied filters (from the URL). */
    filters = {},
    /** { amount:{min,max}, date:{min,max}, histogram:number[] } */
    facets = { amount: { min: 0, max: 0 }, date: { min: null, max: null }, histogram: [], overflow: false },
    /** [{ value, emoji, name }] */
    categoryOptions = [],
    /** @type {string[]} */
    payers = [],
    lang = 'de',
    /** @type {(f: Record<string, string>) => void} */
    onChange
  } = $props();

  const t = $derived(m[/** @type {'en' | 'de'} */ (lang)]);

  const amountFloor = $derived(Math.floor(facets?.amount?.min ?? 0));
  const amountCeil = $derived(Math.ceil(facets?.amount?.max ?? 0));
  const amountStep = $derived(Math.max(1, Math.round((amountCeil - amountFloor) / 100)));
  const hasAmount = $derived(amountCeil > amountFloor);
  const dateMin = $derived((facets?.date?.min ?? '').slice(0, 10));
  const dateMax = $derived((facets?.date?.max ?? '').slice(0, 10));

  /** @param {string} s */
  const parseList = (s) => (s ? s.split(',').filter(Boolean) : []);

  // Working state, seeded from the applied filters.
  // svelte-ignore state_referenced_locally
  let q = $state(filters.q || '');
  /** @type {string[]} */
  // svelte-ignore state_referenced_locally
  let category = $state(parseList(filters.category));
  /** @type {string[]} */
  // svelte-ignore state_referenced_locally
  let paidBy = $state(parseList(filters.paidBy));
  // svelte-ignore state_referenced_locally
  let dateFrom = $state(filters.dateFrom || '');
  // svelte-ignore state_referenced_locally
  let dateTo = $state(filters.dateTo || '');
  // svelte-ignore state_referenced_locally
  let amountLow = $state(filters.amountMin ? Number(filters.amountMin) : Math.floor(facets?.amount?.min ?? 0));
  // svelte-ignore state_referenced_locally
  let amountHigh = $state(filters.amountMax ? Number(filters.amountMax) : Math.ceil(facets?.amount?.max ?? 0));

  let open = $state(false);
  /** @type {HTMLElement | undefined} */
  let root = $state();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let searchTimer;

  // Re-sync working state when applied filters change (external nav / reset).
  $effect(() => {
    q = filters.q || '';
    category = parseList(filters.category);
    paidBy = parseList(filters.paidBy);
    dateFrom = filters.dateFrom || '';
    dateTo = filters.dateTo || '';
    amountLow = filters.amountMin ? Number(filters.amountMin) : Math.floor(facets?.amount?.min ?? 0);
    amountHigh = filters.amountMax ? Number(filters.amountMax) : Math.ceil(facets?.amount?.max ?? 0);
  });

  /** Build a filter object from the working state (only narrowed values). */
  function build() {
    /** @type {Record<string, string>} */
    const f = {};
    if (q.trim()) f.q = q.trim();
    if (category.length) f.category = category.slice().sort().join(',');
    if (paidBy.length) f.paidBy = paidBy.slice().sort().join(',');
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    if (hasAmount && amountLow > amountFloor) f.amountMin = String(amountLow);
    if (hasAmount && amountHigh < amountCeil) f.amountMax = String(amountHigh);
    return f;
  }

  function appliedObj() {
    /** @type {Record<string, string>} */
    const a = {};
    for (const k of ['q', 'category', 'paidBy', 'dateFrom', 'dateTo', 'amountMin', 'amountMax']) {
      if (filters[k]) a[k] = filters[k];
    }
    return a;
  }

  // Emit only when the built filters differ from what's applied (loop guard).
  function emit() {
    const f = build();
    if (JSON.stringify(f) !== JSON.stringify(appliedObj())) onChange?.(f);
  }

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(emit, 300);
  }

  function toggleCategory(/** @type {string} */ c) {
    category = category.includes(c) ? category.filter((x) => x !== c) : [...category, c];
    emit();
  }
  function togglePayer(/** @type {string} */ u) {
    paidBy = paidBy.includes(u) ? paidBy.filter((x) => x !== u) : [...paidBy, u];
    emit();
  }

  function resetAll() {
    q = '';
    category = [];
    paidBy = [];
    dateFrom = '';
    dateTo = '';
    amountLow = amountFloor;
    amountHigh = amountCeil;
    emit();
  }

  function fmtAmount(/** @type {number} */ v) {
    return `CHF ${v}`;
  }

  // Active filters as removable chips.
  let chips = $derived.by(() => {
    /** @type {{ key: string, label: string, clear: () => void }[]} */
    const out = [];
    if (filters.q) out.push({ key: 'q', label: `“${filters.q}”`, clear: () => { q = ''; emit(); } });
    for (const c of parseList(filters.category)) {
      const opt = categoryOptions.find((/** @type {any} */ o) => o.value === c);
      out.push({ key: `cat-${c}`, label: opt ? `${opt.emoji} ${opt.name}` : c, clear: () => { category = category.filter((x) => x !== c); emit(); } });
    }
    for (const u of parseList(filters.paidBy)) {
      out.push({ key: `payer-${u}`, label: u, clear: () => { paidBy = paidBy.filter((x) => x !== u); emit(); } });
    }
    if (filters.dateFrom || filters.dateTo) {
      const label = filters.dateFrom && filters.dateTo ? `${filters.dateFrom} – ${filters.dateTo}`
        : filters.dateFrom ? `≥ ${filters.dateFrom}` : `≤ ${filters.dateTo}`;
      out.push({ key: 'date', label, clear: () => { dateFrom = ''; dateTo = ''; emit(); } });
    }
    if (filters.amountMin || filters.amountMax) {
      const label = filters.amountMin && filters.amountMax
        ? `CHF ${filters.amountMin}–${filters.amountMax}`
        : filters.amountMin ? `≥ CHF ${filters.amountMin}` : `≤ CHF ${filters.amountMax}`;
      out.push({ key: 'amount', label, clear: () => { amountLow = amountFloor; amountHigh = amountCeil; emit(); } });
    }
    return out;
  });
  let activeCount = $derived(chips.length);

  // Light-dismiss the panel on outside click / Escape.
  $effect(() => {
    if (!open) return;
    const onPointer = (/** @type {PointerEvent} */ e) => {
      if (root && !root.contains(/** @type {Node} */ (e.target))) open = false;
    };
    const onKey = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Escape') open = false;
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="filter-bar" bind:this={root}>
  <div class="top">
    <div class="search-wrap">
      <SearchInput
        bind:value={q}
        placeholder={t.search_payments}
        clearTitle={t.clear_filter}
        oninput={onSearchInput}
        onClear={() => { q = ''; emit(); }}
      />
    </div>
    <button
      type="button"
      class="filter-toggle"
      class:open
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <SlidersHorizontal size={16} aria-hidden="true" />
      <span>{t.filters}</span>
      {#if activeCount > 0}<span class="badge">{activeCount}</span>{/if}
      <ChevronDown class="chev" size={16} aria-hidden="true" />
    </button>
  </div>

  {#if activeCount > 0}
    <div class="active-chips">
      {#each chips as chip (chip.key)}
        <button type="button" class="chip" onclick={chip.clear}>
          <span>{chip.label}</span><X size={13} aria-hidden="true" />
        </button>
      {/each}
    </div>
  {/if}

  {#if open}
    <div class="panel" transition:slide={{ duration: 180 }}>
      <fieldset>
        <legend>{t.category_label}</legend>
        <div class="pills">
          {#each categoryOptions as opt (opt.value)}
            <button type="button" class="pill" class:active={category.includes(opt.value)} onclick={() => toggleCategory(opt.value)}>
              <span class="pill-emoji">{opt.emoji}</span>{opt.name}
            </button>
          {/each}
        </div>
      </fieldset>

      {#if payers.length > 0}
        <fieldset>
          <legend>{t.paid_by_form}</legend>
          <div class="pills">
            {#each payers as u (u)}
              <button type="button" class="pill payer" class:active={paidBy.includes(u)} onclick={() => togglePayer(u)}>
                <ProfilePicture username={u} size={20} />{u}
              </button>
            {/each}
          </div>
        </fieldset>
      {/if}

      <fieldset>
        <legend>{t.date_range}</legend>
        <div class="date-range">
          <DatePicker bind:value={dateFrom} {lang} min={dateMin} max={dateTo || dateMax} onchange={emit} />
          <span class="dash">–</span>
          <DatePicker bind:value={dateTo} {lang} min={dateFrom || dateMin} max={dateMax} onchange={emit} />
        </div>
      </fieldset>

      {#if hasAmount}
        <fieldset>
          <legend>{t.amount_label.replace(' *', '')}</legend>
          <RangeSlider
            label="CHF"
            min={amountFloor}
            max={amountCeil}
            step={amountStep}
            bind:low={amountLow}
            bind:high={amountHigh}
            histogram={facets.histogram}
            overflow={facets.overflow}
            format={fmtAmount}
            oncommit={emit}
          />
        </fieldset>
      {/if}

      <div class="panel-foot">
        <button type="button" class="reset" onclick={resetAll} disabled={activeCount === 0}>{t.clear_filter}</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-bar {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.7rem 0.8rem;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.25rem;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  /* The shared SearchInput is styled for a hero; tame it for inline use. */
  .search-wrap {
    flex: 1;
    min-width: 0;
  }

  .search-wrap :global(.search) {
    width: 100%;
    max-width: none;
    margin: 0;
    font-size: 1rem;
    filter: none;
  }

  .search-wrap :global(.search:hover),
  .search-wrap :global(.search:focus-within) {
    scale: 1;
    filter: none;
  }

  .search-wrap :global(input) {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    padding: 0.6rem 2rem 0.6rem 0.9rem;
    border: 1px solid var(--color-border);
  }

  .search-wrap :global(input::placeholder) {
    color: var(--color-text-secondary);
  }

  .search-wrap :global(.search-button) {
    color: var(--color-text-secondary);
  }

  .filter-toggle {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-primary);
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: background 120ms, border-color 120ms;
  }

  .filter-toggle:hover { background: var(--color-bg-elevated); }
  .filter-toggle.open { border-color: var(--color-primary); background: var(--color-bg-elevated); }
  .filter-toggle :global(.chev) { transition: rotate 200ms; }
  .filter-toggle.open :global(.chev) { rotate: 180deg; }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.35rem;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .active-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.6rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font: inherit;
    font-size: 0.78rem;
    padding: 0.2rem 0.45rem 0.2rem 0.65rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
    color: var(--color-text-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--color-border));
  }

  .chip :global(svg) { opacity: 0.6; }
  .chip:hover :global(svg) { opacity: 1; }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 0.7rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--color-border);
  }

  fieldset { border: 0; padding: 0; margin: 0; }

  legend {
    display: block;
    margin-bottom: 0.45rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-tertiary);
  }

  .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.28rem 0.7rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
    text-transform: capitalize;
    transition: border-color 120ms, background 120ms, color 120ms;
  }

  .pill.payer { padding-left: 0.3rem; }
  .pill:hover { border-color: var(--color-primary); color: var(--color-text-primary); }

  .pill.active {
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    border-color: var(--color-primary);
  }

  .pill-emoji { font-size: 1rem; line-height: 1; }

  .date-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .date-range .dash { color: var(--color-text-tertiary); }

  .panel-foot { display: flex; justify-content: flex-end; }

  .reset {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: 0.85rem;
    padding: 0.4rem 0.9rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
  }

  .reset:hover:not(:disabled) { background: var(--color-bg-elevated); }
  .reset:disabled { opacity: 0.45; cursor: default; }

  @media (max-width: 560px) {
    .date-range { flex-wrap: wrap; }
  }
</style>
