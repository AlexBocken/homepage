<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  
  export let recipeId: string;
  export let isFavorite: boolean = false;
  export let isLoggedIn: boolean = false;
  
  let isLoading = false;

  async function toggleFavorite(event: Event) {
    // If JavaScript is available, prevent form submission and handle client-side
    if (browser) {
      event.preventDefault();
      
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
    // If no JS, form will submit normally
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
  <form method="post" action="?/toggleFavorite" style="display: inline;" use:enhance>
    <input type="hidden" name="recipeId" value={recipeId} />
    <input type="hidden" name="isFavorite" value={isFavorite} />
    <button 
      type="submit"
      class="favorite-button"
      disabled={isLoading}
      on:click={toggleFavorite}
      title={isFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
    >
      {isFavorite ? '❤️' : '🖤'}
    </button>
  </form>
{/if}