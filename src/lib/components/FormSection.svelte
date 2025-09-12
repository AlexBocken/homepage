<script>
  export let title = '';
</script>

<div class="form-section">
  {#if title}
    <h2>{title}</h2>
  {/if}
  <slot />
</div>

<style>
  .form-section {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    .form-section {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    .form-section h2 {
      color: var(--font-default-dark);
    }
  }
</style>