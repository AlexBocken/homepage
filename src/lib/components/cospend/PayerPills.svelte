<script>
  /** "Paid by" picker for the payment forms: one radio pill with avatar per user. */
  import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

  /**
   * @typedef {Object} Props
   * @property {string} value selected payer
   * @property {string[]} users
   * @property {string} label accessible name of the group
   */

  /** @type {Props} */
  let { value = $bindable(), users, label } = $props();
</script>

<div class="payer-pills" role="radiogroup" aria-label={label}>
  {#each users as user (user)}
    <button
      type="button"
      role="radio"
      aria-checked={value === user}
      class="payer-pill"
      class:selected={value === user}
      onclick={() => value = user}
    >
      <ProfilePicture username={user} size={26} />
      <span>{user}</span>
    </button>
  {/each}
</div>

<style>
  .payer-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .payer-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.85rem 0.3rem 0.3rem;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border);
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: capitalize;
    cursor: pointer;
    transition: border-color 120ms, background 120ms, transform 100ms;
  }

  .payer-pill:hover { border-color: var(--color-primary); }
  .payer-pill:active { transform: scale(0.97); }

  .payer-pill:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .payer-pill.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface));
  }
</style>
