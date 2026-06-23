<script>
  import { scale, fade } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';
  import { getRarityColor } from '$lib/utils/stickers';
  import { SILHOUETTES } from '$lib/data/stickerSilhouettes.js';
  import StickerOutline from './StickerOutline.svelte';

  let { sticker, owned = true, count = 0, dropChance = 0, firstEarnedLabel = '', sourceTask = '', onclose } = $props();

  const rarityLabels = /** @type {Record<string, string>} */ ({
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    legendary: 'Legendär'
  });
  const foilByRarity = /** @type {Record<string, number>} */ ({
    common: 0,
    uncommon: 0.25,
    rare: 0.65,
    legendary: 1
  });

  /** @param {number} p drop probability in 0..1 */
  function formatChance(p) {
    if (!p) return '—';
    const pct = p * 100;
    if (pct >= 1) return `${pct.toFixed(1).replace('.', ',')} %`;
    return `${pct.toFixed(2).replace('.', ',')} %`;
  }
  let chanceLabel = $derived(formatChance(dropChance));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="backdrop" transition:fade={{ duration: 180 }} onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose?.()}>
  <div
    class="card"
    transition:scale={{ start: 0.85, duration: 320, easing: elasticOut }}
    style="--rarity: {getRarityColor(sticker.rarity)}; --foil: {foilByRarity[sticker.rarity]};"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="stage">
      {#if owned}
        <div class="vinyl">
          <img src="/stickers/{sticker.image}" alt={sticker.name} />
          <span class="foil" style="--m: url('/stickers/{sticker.image}');" aria-hidden="true"></span>
        </div>
      {:else}
        <StickerOutline
          d={SILHOUETTES[sticker.image]}
          size={150}
          strokeWidth={5}
          dash="0.6 12"
          stroke="color-mix(in srgb, var(--rarity) 55%, var(--color-text-secondary))"
        />
      {/if}
    </div>

    <h2 class="title">{owned ? sticker.name : '???'}</h2>
    <span class="rarity-badge">{rarityLabels[sticker.rarity]}</span>
    <p class="desc">{owned ? sticker.description : 'Noch nicht gesammelt'}</p>

    <dl class="stats">
      <div><dt>Drop-Chance (mittel)</dt><dd>{chanceLabel}</dd></div>
      {#if owned}
        <div><dt>Anzahl</dt><dd>×{count}</dd></div>
        <div><dt>Zuerst erhalten</dt><dd>{firstEarnedLabel || '—'}</dd></div>
        <div><dt>Quelle</dt><dd>{sourceTask || '—'}</dd></div>
      {/if}
    </dl>

    <button class="close" onclick={onclose}>Schliessen</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    padding: 1rem;
  }
  .card {
    position: relative;
    width: 100%;
    max-width: 340px;
    padding: 1.5rem 1.5rem 1.25rem;
    text-align: center;
    border-radius: var(--radius-card);
    background:
      radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--rarity) 22%, var(--color-surface)), var(--color-surface));
    border: 2px solid color-mix(in srgb, var(--rarity) 60%, transparent);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }

  .stage {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 170px;
    margin-bottom: 0.5rem;
  }
  .stage::before {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--rarity), transparent 65%);
    opacity: 0.4;
  }
  .vinyl { position: relative; width: 150px; height: 150px; }
  .vinyl img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* die-cut white border + drop shadow */
    filter:
      drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff)
      drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)
      drop-shadow(0 6px 7px rgba(0, 0, 0, 0.3));
  }
  .foil {
    position: absolute;
    inset: 0;
    pointer-events: none;
    -webkit-mask: var(--m) center / contain no-repeat;
    mask: var(--m) center / contain no-repeat;
    background: repeating-linear-gradient(
      115deg,
      rgba(0, 231, 255, 0.55) 0%,
      rgba(255, 0, 231, 0.55) 7%,
      rgba(255, 245, 0, 0.55) 14%,
      rgba(0, 231, 255, 0.55) 21%
    );
    background-size: 250% 250%;
    mix-blend-mode: color-dodge;
    opacity: var(--foil);
    animation: shift 6s linear infinite;
  }
  @keyframes shift {
    to { background-position: 250% 0; }
  }

  .title {
    margin: 0;
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-weight: 700;
    font-size: 1.85rem;
    line-height: 1.1;
    color: var(--color-text-primary);
  }
  .rarity-badge {
    display: inline-block;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--rarity);
  }
  .desc {
    margin: 0.5rem 0 1rem;
    font-size: 0.88rem;
    font-style: italic;
    color: var(--color-text-secondary);
  }

  .stats {
    margin: 0 0 1.25rem;
    text-align: left;
    font-size: 0.82rem;
  }
  .stats div {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.4rem 0.2rem;
    border-bottom: 1px solid var(--color-border);
  }
  .stats dt { color: var(--color-text-secondary); }
  .stats dd { margin: 0; font-weight: 600; color: var(--color-text-primary); text-align: right; }

  .close {
    padding: 0.55rem 2rem;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition-fast);
  }
  .close:hover { background: var(--color-primary-hover); }

  @media (prefers-reduced-motion: reduce) {
    .foil { animation: none; }
  }
</style>
