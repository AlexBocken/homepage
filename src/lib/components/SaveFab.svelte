<script>
  import Check from '$lib/assets/icons/Check.svelte';

  let { disabled = false, onclick, label = 'Save', type = 'submit' } = $props();
</script>

<button
  {type}
  class="fab-save"
  {onclick}
  {disabled}
  aria-label={label}
>
  <Check fill="white" width="2rem" height="2rem" />
</button>

<style>
  .fab-save {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 1rem;
    height: 1rem;
    padding: 2rem;
    margin: 2rem;
    border: none;
    border-radius: var(--radius-pill);
    background-color: var(--red);
    display: grid;
    justify-content: center;
    align-content: center;
    cursor: pointer;
    z-index: 100;
    transition: background-color 0.2s;
  }

  .fab-save:hover, .fab-save:focus {
    background-color: var(--nord11);
  }

  .fab-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media screen and (max-width: 500px) {
    .fab-save {
      margin: 1rem;
    }
  }
</style>
