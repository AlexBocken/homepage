<script>
  import { scale, fade } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';
  import { getRarityColor } from '$lib/utils/stickers';

  let { sticker, onclose } = $props();

  const rarityLabels = /** @type {Record<string, string>} */ ({
    common: 'Gewöhnlich',
    uncommon: 'Ungewöhnlich',
    rare: 'Selten',
    legendary: 'Legendär'
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup-backdrop" transition:fade={{ duration: 200 }} onclick={onclose} onkeydown={e => e.key === 'Escape' && onclose?.()}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="popup-card" transition:scale={{ start: 0.5, duration: 500, easing: elasticOut }} onclick={e => e.stopPropagation()}>
    <div class="sticker-display" style="--rarity-color: {getRarityColor(sticker.rarity)}">
      <img class="sticker-img" src="/stickers/{sticker.image}" alt={sticker.name} />
    </div>
    <div class="popup-text">
      <h3>Sticker erhalten!</h3>
      <p class="sticker-name">{sticker.name}</p>
      <p class="sticker-desc">{sticker.description}</p>
      <span class="rarity-badge" style="color: {getRarityColor(sticker.rarity)}">
        {rarityLabels[sticker.rarity] || sticker.rarity}
      </span>
    </div>
    <button class="btn-close" onclick={onclose}>Toll!</button>
  </div>
</div>

<style>
  .popup-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .popup-card {
    background: var(--color-bg-primary, white);
    border-radius: 20px;
    padding: 2rem;
    text-align: center;
    max-width: 320px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  .sticker-display {
    width: 100px;
    height: 100px;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle, var(--rarity-color, var(--nord13)) 0%, transparent 70%);
    opacity: 0.95;
  }
  .sticker-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
  }

  .popup-text h3 {
    margin: 0 0 0.3rem;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-primary, #333);
  }
  .sticker-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--nord10);
  }
  .sticker-desc {
    margin: 0.25rem 0 0.5rem;
    font-size: 0.82rem;
    color: var(--color-text-secondary, #888);
  }
  .rarity-badge {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-close {
    margin-top: 1.25rem;
    padding: 0.6rem 2rem;
    border: none;
    background: var(--nord10);
    color: white;
    border-radius: 100px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms;
  }
  .btn-close:hover { background: var(--nord9); }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .popup-card {
      background: var(--nord1);
    }
  }
  :global(:root[data-theme="dark"]) .popup-card {
    background: var(--nord1);
  }
</style>
