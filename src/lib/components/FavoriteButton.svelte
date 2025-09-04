<script lang="ts">
  import { favorites } from '$lib/stores/favorites';
  import { onMount } from 'svelte';
  
  export let recipeId: string; // This will be short_name from the component usage
  export let isFavorite: boolean = false; // Initial state from server
  export let isLoggedIn: boolean = false;
  
  let currentIsFavorite = isFavorite;
  let isLoading = false;

  // Load current favorite status when component mounts
  onMount(async () => {
    if (isLoggedIn) {
      currentIsFavorite = await favorites.isFavoriteByShortName(recipeId);
    }
  });

  async function toggleFavorite() {
    if (!isLoggedIn || isLoading) return;
    
    isLoading = true;
    try {
      await favorites.toggle(recipeId);
      currentIsFavorite = !currentIsFavorite;
    } finally {
      isLoading = false;
    }
  }
</script>

<style>
  .favorite-button {
    all: unset;
    font-size: 1.5rem;
    cursor: pointer;
    transition: 100ms;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    position: absolute;
    bottom: 0.5em;
    right: 0.5em;
  }
  
  .favorite-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .favorite-button:hover,
  .favorite-button:focus-visible {
    transform: scale(1.2);
  }
</style>

{#if isLoggedIn}
  <button 
    class="favorite-button"
    disabled={isLoading}
    on:click={toggleFavorite}
    title={currentIsFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
  >
    {currentIsFavorite ? '❤️' : '🖤'}
  </button>
{/if}