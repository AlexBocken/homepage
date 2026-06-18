<script>
  import { penColor } from '$lib/utils/receiptColors';

  /** @typedef {import('$lib/utils/receiptOcr').ReceiptAnnotations} ReceiptAnnotations */

  let {
    /** @type {string} */
    src,
    /** @type {ReceiptAnnotations} */
    annotations,
    alt = ''
  } = $props();

  /** @param {{x0:number,y0:number,x1:number,y1:number}} b */
  const boxStyle = (b) =>
    `left:${b.x0 * 100}%;top:${b.y0 * 100}%;width:${(b.x1 - b.x0) * 100}%;height:${(b.y1 - b.y0) * 100}%`;

  let byUser = $derived.by(() => {
    /** @type {Record<string, number>} */
    const out = {};
    for (const it of annotations?.items ?? []) out[it.user] = (out[it.user] ?? 0) + it.amount;
    return out;
  });
</script>

<div class="receipt-annotated">
  <div class="ro-image">
    <img {src} {alt} />
    {#each annotations?.items ?? [] as it (it.box.x0 + '-' + it.box.y0)}
      {@const c = penColor(it.user)}
      <span class="ro-box" style="{boxStyle(it.box)};background:{c.bg};outline-color:{c.line}"></span>
    {/each}
    {#if annotations?.totalBox}
      <span class="ro-box total" style={boxStyle(annotations.totalBox)}></span>
    {/if}
  </div>

  {#if Object.keys(byUser).length > 0}
    <div class="ro-legend">
      {#each Object.entries(byUser) as [user, amount] (user)}
        <span class="ro-chip" style="--c:{penColor(user).line}">{user}: CHF {amount.toFixed(2)}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .receipt-annotated {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .ro-image {
    position: relative;
    display: block;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    line-height: 0;
  }

  .ro-image img {
    display: block;
    max-width: 100%;
    max-height: 70vh;
    width: auto;
    height: auto;
    background: #fff;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .ro-box {
    position: absolute;
    border-radius: 2px;
    mix-blend-mode: multiply;
    outline: 1.5px solid transparent;
  }

  .ro-box.total {
    background: rgba(255, 218, 56, 0.55);
    outline-color: rgba(214, 158, 0, 0.7);
  }

  .ro-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
  }

  .ro-chip {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--c, var(--color-border));
    color: var(--color-text-primary);
    text-transform: capitalize;
    font-variant-numeric: tabular-nums;
  }
</style>
