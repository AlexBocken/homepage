<script lang="ts">
  import Heart from '$lib/assets/icons/Heart.svelte';
  
  export let recipeId: string;
  export let isFavorite: boolean = false;
  export let isLoggedIn: boolean = false;
  
  let isLoading = false;

  async function toggleFavorite() {
    if (!isLoggedIn || isLoading) return;
    
    isLoading = true;
    
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch('/api/rezepte/favorites', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId }),
      });
      
      if (response.ok) {
        isFavorite = !isFavorite;
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<style>
  .favorite-button {
    all: unset;
    color: var(--nord0);
    font-size: 1.1rem;
    background-color: var(--nord5);
    border-radius: 10000px;
    padding: 0.5em 1em;
    transition: 100ms;
    box-shadow: 0em 0em 0.5em 0.05em rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
  }
  
  .favorite-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .favorite-button.favorited {
    background-color: var(--nord11);
    color: white;
  }
  
  .favorite-button:not(.favorited):hover,
  .favorite-button:not(.favorited):focus-visible {
    transform: scale(1.1);
    background-color: var(--nord11);
    color: white;
    box-shadow: 0.1em 0.1em 0.5em 0.1em rgba(0,0,0,0.3);
  }
  
  .favorite-button.favorited:hover,
  .favorite-button.favorited:focus-visible {
    transform: scale(1.1);
    background-color: var(--nord5);
    color: var(--nord0);
    box-shadow: 0.1em 0.1em 0.5em 0.1em rgba(0,0,0,0.3);
  }
  
  @media (prefers-color-scheme: dark) {
    .favorite-button {
      background-color: var(--nord0);
      color: white;
    }
    
    .favorite-button.favorited:hover,
    .favorite-button.favorited:focus-visible {
      background-color: var(--nord6);
      color: var(--nord0);
    }
  }
</style>

{#if isLoggedIn}
  <button 
    class="favorite-button" 
    class:favorited={isFavorite}
    disabled={isLoading}
    on:click={toggleFavorite}
  >
    <Heart />
    {isFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
  </button>
{/if}