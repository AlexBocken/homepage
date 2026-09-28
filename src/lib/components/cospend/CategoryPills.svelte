<script>
  /** Category picker for the payment forms: one radio pill per category. */
  import { getCategoryOptionsI18n } from '$lib/js/cospendI18n';

  /**
   * @typedef {Object} Props
   * @property {string} value selected category
   * @property {import('$lib/js/cospendI18n').CospendLang} lang
   * @property {string} label accessible name of the group
   */

  /** @type {Props} */
  let { value = $bindable(), lang, label } = $props();

  const options = $derived(getCategoryOptionsI18n(lang));
</script>

<div class="pill-group" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.value}
      class="opt-pill"
      class:selected={value === option.value}
      onclick={() => value = option.value}
    >
      <span class="pill-emoji">{option.emoji}</span>{option.name}
    </button>
  {/each}
</div>

<style>
  .pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .opt-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 120ms, background 120ms, color 120ms, transform 100ms;
  }

  .opt-pill:hover {
    border-color: var(--color-primary);
    color: var(--color-text-primary);
  }

  .opt-pill:active { transform: scale(0.97); }

  .opt-pill:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .opt-pill.selected {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
  }

  .pill-emoji { font-size: 1.05rem; line-height: 1; }
</style>
