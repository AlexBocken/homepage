<script>
  import { onDestroy, onMount } from 'svelte';
  import ScanLine from '@lucide/svelte/icons/scan-line';
  import X from '@lucide/svelte/icons/x';
  import ProfilePicture from './ProfilePicture.svelte';
  import { m } from '$lib/js/cospendI18n';
  import { scanReceipt, parsePrice } from '$lib/utils/receiptOcr';
  import { penColor } from '$lib/utils/receiptColors';

  /** @typedef {import('$lib/utils/receiptOcr').ReceiptScan} ReceiptScan */
  /** @typedef {import('$lib/utils/receiptOcr').ReceiptBox} ReceiptBox */
  /** @typedef {import('$lib/utils/receiptOcr').ReceiptAnnotations} ReceiptAnnotations */

  let {
    /** @type {File | null} */
    imageFile = null,
    lang = 'de',
    /** @type {string[]} */
    users = [],
    /** @type {(scan: ReceiptScan) => void} */
    onscanned,
    /** @type {(personals: Record<string, number>) => void} */
    onpersonal,
    /** @type {(annotations: ReceiptAnnotations) => void} */
    onannotations,
    /** @type {() => void} */
    onremove
  } = $props();

  const t = $derived(m[/** @type {'en' | 'de'} */ (lang)]);

  const colorOf = penColor;

  let scanning = $state(false);
  let scan = $state(/** @type {ReceiptScan | null} */ (null));
  let failed = $state(false);

  // Active pen: 'total' sets the grand total; a username assigns to that person.
  let mode = $state('total');
  // lineKey → username for personal assignments.
  let assignments = $state(/** @type {Record<string, string>} */ ({}));

  let override = $state(/** @type {{ total: number, box: ReceiptBox } | null} */ (null));
  let drawRect = $state(/** @type {{ x0: number, y0: number, x1: number, y1: number } | null} */ (null));
  let drawing = false;
  /** @type {{ x: number, y: number } | null} */
  let startPt = null;

  let effectiveTotal = $derived(override ? override.total : (scan ? scan.total : null));
  let effectiveBox = $derived(override ? override.box : (scan ? scan.totalBox : null));

  // svelte-ignore state_referenced_locally
  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : '';
  onDestroy(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  });

  // Scan as soon as the image is mounted (keyed on imageFile → fresh per upload).
  onMount(runScan);

  let pricedBoxes = $derived.by(() => {
    if (!scan) return [];
    return scan.lines.filter((l) => l.price != null).map((l) => ({ price: l.price, bbox: l.bbox }));
  });

  /** @param {ReceiptBox} b */
  const keyOf = (b) => `${b.x0}-${b.y0}`;

  let personals = $derived.by(() => {
    /** @type {Record<string, number>} */
    const out = {};
    for (const u of users) out[u] = 0;
    for (const b of pricedBoxes) {
      const u = assignments[keyOf(b.bbox)];
      if (u && b.price != null) out[u] = (out[u] ?? 0) + b.price;
    }
    return out;
  });
  let totalPersonal = $derived(Object.values(personals).reduce((a, b) => a + b, 0));
  let anyAssigned = $derived(Object.keys(assignments).length > 0);

  /** @param {ReceiptBox} b */
  function boxStyle(b) {
    if (!scan) return '';
    return `left:${(b.x0 / scan.width) * 100}%;top:${(b.y0 / scan.height) * 100}%;width:${((b.x1 - b.x0) / scan.width) * 100}%;height:${((b.y1 - b.y0) / scan.height) * 100}%`;
  }

  /** @param {number} total @param {ReceiptBox} box */
  function setTotal(total, box) {
    override = { total, box };
    if (scan) onscanned?.({ ...scan, total, totalBox: box });
    emitAnnotations();
  }

  function emitPersonals() {
    onpersonal?.({ ...personals });
  }

  // Emit the persisted overlay data (boxes as 0..1 fractions of the image).
  function emitAnnotations() {
    if (!scan) return;
    const W = scan.width;
    const H = scan.height;
    /** @param {ReceiptBox} b */
    const f = (b) => ({ x0: b.x0 / W, y0: b.y0 / H, x1: b.x1 / W, y1: b.y1 / H });
    const tb = override ? override.box : scan.totalBox;
    /** @type {import('$lib/utils/receiptOcr').ReceiptAnnotationItem[]} */
    const items = [];
    for (const b of pricedBoxes) {
      const u = assignments[keyOf(b.bbox)];
      if (u && b.price != null) items.push({ box: f(b.bbox), user: u, amount: b.price });
    }
    onannotations?.({ totalBox: tb ? f(tb) : null, items });
  }

  /** @param {{ price: number | null, bbox: ReceiptBox }} b */
  function onLineTap(b) {
    if (mode === 'total') {
      if (b.price != null) setTotal(b.price, b.bbox);
      return;
    }
    const key = keyOf(b.bbox);
    if (assignments[key] === mode) {
      delete assignments[key];
    } else {
      assignments[key] = mode;
    }
    assignments = { ...assignments };
    emitPersonals();
    emitAnnotations();
  }

  /** @param {{ x0:number, y0:number, x1:number, y1:number }} rect fractions */
  function selectFromRect(rect) {
    if (!scan) return;
    const W = scan.width;
    const H = scan.height;
    const frac = scan.lines.map((l) => ({
      l,
      fx0: l.bbox.x0 / W,
      fy0: l.bbox.y0 / H,
      fx1: l.bbox.x1 / W,
      fy1: l.bbox.y1 / H
    }));

    const area = (rect.x1 - rect.x0) * (rect.y1 - rect.y0);
    let hits;
    if (area < 0.0009) {
      const cx = (rect.x0 + rect.x1) / 2;
      const cy = (rect.y0 + rect.y1) / 2;
      hits = frac.filter((o) => cx >= o.fx0 && cx <= o.fx1 && cy >= o.fy0 && cy <= o.fy1);
    } else {
      hits = frac.filter((o) => !(o.fx1 < rect.x0 || o.fx0 > rect.x1 || o.fy1 < rect.y0 || o.fy0 > rect.y1));
    }
    const priced = hits.filter((o) => o.l.price != null);
    if (priced.length === 0) return;

    if (mode === 'total') {
      const best = priced.reduce((a, b) => (/** @type {number} */ (b.l.price) > /** @type {number} */ (a.l.price) ? b : a));
      setTotal(/** @type {number} */ (best.l.price), best.l.bbox);
    } else {
      for (const o of priced) assignments[keyOf(o.l.bbox)] = mode;
      assignments = { ...assignments };
      emitPersonals();
      emitAnnotations();
    }
  }

  /** @param {PointerEvent} e */
  function fracOf(e) {
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    };
  }

  /** @param {PointerEvent} e */
  function onPointerDown(e) {
    if (!scan) return;
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.closest('.line-box') || target.closest('.remove-x')) return;
    e.preventDefault();
    const p = fracOf(e);
    startPt = p;
    drawing = true;
    drawRect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    /** @type {HTMLElement} */ (e.currentTarget).setPointerCapture?.(e.pointerId);
  }

  /** @param {PointerEvent} e */
  function onPointerMove(e) {
    if (!drawing || !startPt) return;
    const p = fracOf(e);
    drawRect = {
      x0: Math.min(startPt.x, p.x),
      y0: Math.min(startPt.y, p.y),
      x1: Math.max(startPt.x, p.x),
      y1: Math.max(startPt.y, p.y)
    };
  }

  function onPointerUp() {
    if (!drawing || !drawRect) {
      drawing = false;
      return;
    }
    drawing = false;
    const rect = drawRect;
    drawRect = null;
    startPt = null;
    selectFromRect(rect);
  }

  async function runScan() {
    if (!imageFile || scanning) return;
    scanning = true;
    failed = false;
    override = null;
    assignments = {};
    mode = 'total';
    try {
      const result = await scanReceipt(imageFile);
      scan = result;
      onscanned?.(result);
      emitAnnotations();
    } catch (err) {
      console.error('Receipt scan failed:', err);
      failed = true;
    } finally {
      scanning = false;
    }
  }
</script>

{#if imageFile}
  <div class="form-section receipt-card">
    <div class="receipt-head">
      <h2>{t.receipt_image}</h2>
    </div>

    <div
      class="receipt-overlay"
      class:interactive={!!scan && !scanning}
      role={scan ? 'application' : undefined}
      aria-label={t.assign_hint}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
    >
      <img src={imageUrl} alt={t.receipt} />

      <button type="button" class="remove-x" onclick={() => onremove?.()} aria-label={t.remove_image}>
        <X size={16} />
      </button>

      {#if scan && !scanning}
        {#each pricedBoxes as b (keyOf(b.bbox))}
          {@const assignedUser = assignments[keyOf(b.bbox)]}
          {@const c = assignedUser ? colorOf(assignedUser) : null}
          <button
            type="button"
            class="line-box"
            class:assigned={!!assignedUser}
            style={boxStyle(b.bbox) + (c ? `;background:${c.bg};border-color:${c.line}` : '')}
            onclick={() => onLineTap(b)}
            aria-label={`CHF ${(/** @type {number} */ (b.price)).toFixed(2)}`}
          ></button>
        {/each}
        {#if effectiveBox}
          <span class="hl-box" style={boxStyle(effectiveBox)}></span>
        {/if}
        {#if drawRect}
          <span
            class="draw-rect"
            style="left:{drawRect.x0 * 100}%;top:{drawRect.y0 * 100}%;width:{(drawRect.x1 - drawRect.x0) * 100}%;height:{(drawRect.y1 - drawRect.y0) * 100}%"
          ></span>
        {/if}
      {/if}

      {#if scanning || (!scan && !failed)}
        <div class="overlay-cta">
          <div class="scan-progress" role="status" aria-live="polite">
            <span class="reading">{t.scan_reading}</span>
            <div class="bar indeterminate"><i></i></div>
          </div>
        </div>
      {:else if failed}
        <div class="overlay-cta">
          <button type="button" class="scan-btn" onclick={runScan}>
            <ScanLine size={18} />
            {t.rescan}
          </button>
        </div>
      {/if}
    </div>

    {#if failed}
      <p class="scan-failed">{t.scan_failed}</p>
    {:else if scan}
      {#if effectiveTotal != null}
        <div class="scan-result ok">
          <span class="res-label">{t.scan_total_label}</span>
          <span class="res-amount">CHF {effectiveTotal.toFixed(2)}</span>
          <button type="button" class="rescan" onclick={runScan}>{t.rescan}</button>
        </div>
      {:else}
        <div class="scan-result warn">
          <span>{t.scan_no_total}</span>
          <button type="button" class="rescan" onclick={runScan}>{t.rescan}</button>
        </div>
      {/if}

      {#if users.length > 0}
        <div class="pens" role="radiogroup" aria-label={t.assign_hint}>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'total'}
            class="pen total"
            class:active={mode === 'total'}
            onclick={() => (mode = 'total')}
          >
            <span class="swatch total-swatch"></span>{t.pen_total}
          </button>
          {#each users as u (u)}
            <button
              type="button"
              role="radio"
              aria-checked={mode === u}
              class="pen"
              class:active={mode === u}
              style="--pen:{colorOf(u).line}"
              onclick={() => (mode = u)}
            >
              <ProfilePicture username={u} size={22} />
              <span class="pen-name">{u}</span>
              {#if personals[u] > 0}<span class="pen-sum">{personals[u].toFixed(2)}</span>{/if}
            </button>
          {/each}
        </div>
        <p class="pick-hint">{mode === 'total' ? t.pick_total_hint : t.assign_hint}</p>
      {:else}
        <p class="pick-hint">{t.pick_total_hint}</p>
      {/if}

      {#if anyAssigned}
        <div class="assign-summary">
          {#each users as u (u)}
            <span class="sum-chip" style="--c:{colorOf(u).line}">{u}: CHF {personals[u].toFixed(2)}</span>
          {/each}
          {#if effectiveTotal != null}
            <span class="sum-chip shared">{t.split_equally}: CHF {Math.max(0, effectiveTotal - totalPersonal).toFixed(2)}</span>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .receipt-card {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
  }

  .receipt-head {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .receipt-head h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }

  /* Shrink-to-fit the image so absolutely-positioned boxes (in % of this box)
     anchor to the rendered image exactly — no letterboxing. */
  .receipt-overlay {
    position: relative;
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    line-height: 0;
    user-select: none;
  }

  .receipt-overlay.interactive {
    touch-action: none;
    cursor: crosshair;
  }

  .receipt-overlay img {
    display: block;
    max-width: 100%;
    max-height: 70vh;
    width: auto;
    height: auto;
    background: #fff;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    pointer-events: none;
  }

  .remove-x {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: var(--radius-pill);
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    cursor: pointer;
    transition: background 120ms, transform 100ms;
    z-index: 3;
  }

  .remove-x:hover {
    background: var(--red);
  }

  .remove-x:active { transform: scale(0.94); }

  .remove-x:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .overlay-cta {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--color-bg-primary) 45%, transparent);
    z-index: 2;
  }

  .scan-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.3rem;
    border-radius: var(--radius-pill);
    border: none;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: background 120ms, transform 100ms;
  }

  .scan-btn:hover { background: var(--color-primary-hover); }
  .scan-btn:active { transform: scale(0.97); }

  .scan-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }


  .scan-failed {
    margin: 0.6rem 0 0;
    font-size: 0.85rem;
    color: var(--orange);
  }

  .scan-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.1rem;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-md);
    min-width: 60%;
  }

  .scan-progress .reading {
    font-size: 0.88rem;
    color: var(--color-text-secondary);
  }

  .bar {
    width: 100%;
    height: 7px;
    border-radius: var(--radius-pill);
    background: var(--color-bg-elevated);
    overflow: hidden;
  }

  .bar.indeterminate i {
    display: block;
    width: 40%;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
    animation: scan-slide 1.1s ease-in-out infinite;
  }

  @keyframes scan-slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar.indeterminate i { animation-duration: 2.2s; }
  }

  .scan-result {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 0.85rem;
    padding: 0.6rem 0.85rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-bg-tertiary);
  }

  .scan-result.ok {
    border-color: color-mix(in srgb, var(--green) 40%, var(--color-border));
    background: color-mix(in srgb, var(--green) 9%, var(--color-surface));
  }

  .scan-result.warn {
    border-color: color-mix(in srgb, var(--orange) 40%, var(--color-border));
    background: color-mix(in srgb, var(--orange) 9%, var(--color-surface));
    font-size: 0.88rem;
    color: var(--color-text-secondary);
  }

  .res-label {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .res-amount {
    font-weight: 700;
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
    color: var(--green);
  }

  .rescan {
    margin-left: auto;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 120ms, color 120ms;
  }

  .rescan:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  /* Pen toolbar */
  .pens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }

  .pen {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.7rem 0.3rem 0.4rem;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: capitalize;
    cursor: pointer;
    transition: border-color 120ms, background 120ms;
  }

  .pen.total { padding-left: 0.7rem; }
  .pen:hover { border-color: var(--color-primary); }

  .pen.active {
    border-color: var(--pen, var(--color-primary));
    background: color-mix(in srgb, var(--pen, var(--color-primary)) 14%, var(--color-surface));
  }

  .pen:focus-visible {
    outline: 2px solid var(--pen, var(--color-primary));
    outline-offset: 2px;
  }

  .swatch {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 3px;
  }

  .total-swatch {
    background: rgba(255, 218, 56, 0.9);
    outline: 1px solid rgba(214, 158, 0, 0.7);
  }

  .pen-sum {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--pen, var(--color-text-primary));
  }

  .pick-hint {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .line-box {
    position: absolute;
    margin: 0;
    padding: 0;
    border: 1px dashed color-mix(in srgb, var(--color-primary) 55%, transparent);
    background: transparent;
    border-radius: 2px;
    cursor: pointer;
    transition: background 100ms;
  }

  .line-box:hover {
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  }

  .line-box.assigned {
    mix-blend-mode: multiply;
    border-style: solid;
  }

  .line-box:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .hl-box {
    position: absolute;
    background: rgba(255, 218, 56, 0.55);
    mix-blend-mode: multiply;
    border-radius: 2px;
    outline: 1.5px solid rgba(214, 158, 0, 0.7);
    pointer-events: none;
  }

  .draw-rect {
    position: absolute;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    border: 1.5px dashed var(--color-primary);
    border-radius: 2px;
    pointer-events: none;
  }

  .assign-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .sum-chip {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--c, var(--color-border));
    color: var(--color-text-primary);
    text-transform: capitalize;
    font-variant-numeric: tabular-nums;
  }

  .sum-chip.shared {
    border-color: var(--color-border);
    color: var(--color-text-secondary);
    text-transform: none;
  }
</style>
