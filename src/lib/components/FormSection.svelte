<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title = '', children } = $props<{ title?: string, children?: Snippet }>();
</script>

<div class="form-section">
  {#if title}
    <h2>{title}</h2>
  {/if}
  {@render children?.()}
</div>

<style>
  .form-section {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
    font-size: 1.25rem;
  }
</style>
