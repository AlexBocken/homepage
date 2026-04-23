<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import Heart from '@lucide/svelte/icons/heart';

  let { recipeId, isFavorite = $bindable(false), isLoggedIn = false } = $props<{ recipeId: string, isFavorite?: boolean, isLoggedIn?: boolean }>();

  const recipeLang = $derived($page.url.pathname.split('/')[1] || 'rezepte');

  let isLoading = $state(false);

  async function toggleFavorite(event: Event) {
    // If JavaScript is available, prevent form submission and handle client-side
    if (browser) {
      event.preventDefault();
      
      if (!isLoggedIn || isLoading) return;
      
      isLoading = true;
      
      try {
        const method = isFavorite ? 'DELETE' : 'POST';
        const response = await fetch(`/api/${recipeLang}/favorites`, {
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
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-fast);
    filter:
      drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6))
      drop-shadow(0 0 3px rgba(0, 0, 0, 0.45));
    position: absolute;
    bottom: 0.5em;
    right: 0.5em;
    color: white;
  }
  .favorite-button.is-favorite {
    color: #ff2d55;
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
      class:is-favorite={isFavorite}
      disabled={isLoading}
      onclick={toggleFavorite}
      aria-label={isFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
      title={isFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
    >
      <Heart size={24} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  </form>
{/if}