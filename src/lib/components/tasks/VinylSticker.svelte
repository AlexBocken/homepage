<script>
  import { getRarityColor } from '$lib/utils/stickers';

  let { sticker, count = 0, owned = false, onpick } = $props();

  const rarityLabels = /** @type {Record<string, string>} */ ({
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    legendary: 'Legendär'
  });
  const foilByRarity = /** @type {Record<string, number>} */ ({
    common: 0,
    uncommon: 0.22,
    rare: 0.6,
    legendary: 1
  });

  /** @param {string} s */
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  let tilt = $derived((hash(sticker.id) % 9) - 4); // -4deg .. 4deg, hand-placed

  /** @type {HTMLElement | undefined} */
  let el = $state();
  let mx = $state(50), my = $state(50), active = $state(false);

  /** @param {PointerEvent} e */
  function onmove(e) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx = Math.round(((e.clientX - r.left) / r.width) * 100);
    my = Math.round(((e.clientY - r.top) / r.height) * 100);
    active = true;
  }
  function leave() {
    mx = 50; my = 50; active = false;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="slot"
  class:owned
  bind:this={el}
  role={owned ? 'button' : undefined}
  tabindex={owned ? 0 : undefined}
  onpointermove={onmove}
  onpointerleave={leave}
  onclick={() => owned && onpick?.(sticker)}
  onkeydown={(e) => owned && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onpick?.(sticker))}
  style="--tilt: {tilt}deg; --mx: {mx}%; --my: {my}%; --m: url('/stickers/{sticker.image}'); --foil: {owned ? foilByRarity[sticker.rarity] : 0}; --on: {active ? 1 : 0}; --rarity: {getRarityColor(sticker.rarity)};"
  title={owned ? `${sticker.name} — ${rarityLabels[sticker.rarity]}` : 'Noch nicht gesammelt'}
>
  {#if owned}
    <div class="vinyl rarity-{sticker.rarity}">
      <span class="glow" aria-hidden="true"></span>
      <img src="/stickers/{sticker.image}" alt={sticker.name} loading="lazy" />
      <span class="sheen" aria-hidden="true"></span>
      <span class="foil" aria-hidden="true"></span>
      {#if count > 1}<span class="dupes">×{count}</span>{/if}
    </div>
    <span class="label">{sticker.name}</span>
  {:else}
    <div class="deboss" aria-hidden="true"></div>
    <span class="label empty">?</span>
  {/if}
</div>

<style>
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.2rem;
  }

  /* ---------- owned: die-cut glossy vinyl ---------- */
  .vinyl {
    position: relative;
    width: 78px;
    height: 78px;
    transform: rotate(var(--tilt));
    transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 180ms;
    cursor: pointer;
  }
  .vinyl img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* white die-cut border + contact shadow */
    filter:
      drop-shadow(1.4px 0 0 #fff) drop-shadow(-1.4px 0 0 #fff)
      drop-shadow(0 1.4px 0 #fff) drop-shadow(0 -1.4px 0 #fff)
      drop-shadow(0 3px 3px rgba(0, 0, 0, 0.28));
  }
  .slot:hover .vinyl {
    transform: rotate(0deg) translateY(-4px) scale(1.06);
  }

  /* rarity aura behind the sticker (scales with grade) */
  .glow {
    position: absolute;
    inset: -14%;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(circle, var(--rarity), transparent 62%);
    opacity: calc(var(--foil) * (0.3 + 0.35 * var(--on)));
    filter: blur(5px);
  }
  .rarity-legendary .glow { animation: pulse 2.8s ease-in-out infinite; }

  /* glossy specular sweep, clipped to the sticker shape */
  .sheen, .foil {
    position: absolute;
    inset: 0;
    pointer-events: none;
    -webkit-mask: var(--m) center / contain no-repeat;
    mask: var(--m) center / contain no-repeat;
  }
  .sheen {
    background: radial-gradient(35% 35% at var(--mx) var(--my), rgba(255, 255, 255, 0.85), transparent 60%),
      linear-gradient(120deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%);
    background-size: 100% 100%, 220% 220%;
    background-position: 0 0, var(--mx) var(--my);
    opacity: calc(0.35 + 0.45 * var(--on));
    mix-blend-mode: overlay;
  }
  /* periodic light sweep for rare+ stickers even at rest */
  .rarity-rare .sheen, .rarity-legendary .sheen {
    animation: sweep 4.5s ease-in-out infinite;
  }

  /* holographic foil for rarer stickers — always shimmers, intensifies on hover */
  .foil {
    background: repeating-linear-gradient(
      115deg,
      rgba(0, 231, 255, 0.55) 0%,
      rgba(255, 0, 231, 0.55) 7%,
      rgba(255, 245, 0, 0.55) 14%,
      rgba(0, 231, 255, 0.55) 21%
    );
    background-size: 250% 250%;
    background-position: var(--mx) var(--my);
    mix-blend-mode: color-dodge;
    opacity: calc(var(--foil) * (0.3 + 0.55 * var(--on)));
    animation: holo 5s linear infinite;
  }
  /* when the pointer is on the card, follow it instead of auto-drifting */
  .slot:hover .foil { animation-play-state: paused; }

  @keyframes holo {
    0% { background-position: 0% 50%; }
    100% { background-position: 250% 50%; }
  }
  @keyframes sweep {
    0%, 100% { background-position: 0 0, -60% 0; }
    50% { background-position: 0 0, 160% 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: calc(var(--foil) * 0.3); transform: scale(1); }
    50% { opacity: calc(var(--foil) * 0.5); transform: scale(1.06); }
  }

  .dupes {
    position: absolute;
    bottom: -2px;
    right: -4px;
    padding: 0.02rem 0.32rem;
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    color: #fff;
    background: var(--nord10);
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-sm);
  }

  /* ---------- missing: debossed silhouette pressed into the page ---------- */
  .deboss {
    width: 70px;
    height: 70px;
    /* fixed paper tones — the album sheet stays cream in both themes */
    background: rgba(90, 74, 44, 0.22);
    -webkit-mask: var(--m) center / contain no-repeat;
    mask: var(--m) center / contain no-repeat;
    filter: drop-shadow(0 1.5px 0.5px rgba(255, 255, 255, 0.7));
    opacity: 0.85;
  }

  .label {
    font-size: 0.62rem;
    text-align: center;
    color: #6a5a3a;
    max-width: 92px;
    line-height: 1.1;
  }
  .label.empty { color: #b0a07c; font-weight: 700; }

  @media (prefers-reduced-motion: reduce) {
    .vinyl { transition: none; }
    .foil, .sheen, .glow { animation: none !important; }
  }
</style>
