<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let status = $derived($page.status);
  let error = $derived($page.error);
  let recipeLang = $derived($page.params.recipeLang);
  let recipeName = $derived($page.params.name);
  let session = $derived($page.data?.session);
  let user = $derived(session?.user);

  // State to track if German recipe exists
  let germanRecipeExists = $state(false);
  let checkingGermanRecipe = $state(false);

  // Check if German recipe exists when on English route with 404
  onMount(async () => {
    const isEnglishRoute = recipeLang === 'recipes';
    if (isEnglishRoute && status === 404) {
      checkingGermanRecipe = true;
      try {
        // Check if German recipe exists
        const response = await fetch(`/api/rezepte/items/${recipeName}`);
        germanRecipeExists = response.ok;
      } catch (e) {
        germanRecipeExists = false;
      } finally {
        checkingGermanRecipe = false;
      }
    }
  });

  function getErrorTitle(status: number) {
    switch (status) {
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Recipe Not Found';
      case 500:
        return 'Server Error';
      default:
        return 'Error';
    }
  }

  function getErrorDescription(status: number) {
    const isEnglishRoute = recipeLang === 'recipes';

    switch (status) {
      case 401:
        return 'You must be logged in to access this page.';
      case 403:
        return 'You do not have permission to access this area.';
      case 404:
        if (isEnglishRoute && germanRecipeExists) {
          return 'This recipe has not been translated to English yet, but the German version is available.';
        }
        return 'The requested recipe could not be found.';
      case 500:
        return 'An unexpected error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  function getErrorIcon(status: number) {
    switch (status) {
      case 401:
        return '🔐';
      case 403:
        return '🚫';
      case 404:
        return '🔍';
      case 500:
        return '⚠️';
      default:
        return '❌';
    }
  }

  function viewGermanRecipe() {
    goto(`/rezepte/${recipeName}`);
  }

  function editToTranslate() {
    goto(`/rezepte/edit/${recipeName}`);
  }

  function goToRecipes() {
    const lang = recipeLang === 'recipes' ? 'recipes' : 'rezepte';
    goto(`/${lang}`);
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      goToRecipes();
    }
  }

  function login() {
    goto('/login');
  }
</script>

<svelte:head>
  <title>{getErrorTitle(status)} - Alexander's Website</title>
</svelte:head>

<main class="error-page">
  <div class="error-container">
    <div class="error-icon">
      {getErrorIcon(status)}
    </div>

    <h1 class="error-title">
      {getErrorTitle(status)}
    </h1>

    <div class="error-code">
      Error {status}
    </div>

    <p class="error-description">
      {getErrorDescription(status)}
    </p>

    {#if error?.message && !checkingGermanRecipe}
      <div class="error-details">
        {error.message}
      </div>
    {/if}

    {#if checkingGermanRecipe}
      <div class="checking-message">
        Checking for German version...
      </div>
    {/if}

    <div class="error-actions">
      {#if status === 401}
        <button class="btn btn-primary" onclick={login}>
          Log In
        </button>
        <button class="btn btn-secondary" onclick={goToRecipes}>
          Go to Recipes
        </button>
      {:else if status === 404 && recipeLang === 'recipes' && germanRecipeExists && !checkingGermanRecipe}
        <!-- Special case: English recipe not found but German exists -->
        <button class="btn btn-primary" onclick={viewGermanRecipe}>
          View German Recipe
        </button>
        {#if user}
          <button class="btn btn-secondary" onclick={editToTranslate}>
            Edit to Translate
          </button>
        {/if}
        <button class="btn btn-secondary" onclick={goToRecipes}>
          Go to Recipes
        </button>
      {:else if status === 404}
        <button class="btn btn-primary" onclick={goToRecipes}>
          Go to Recipes
        </button>
        <button class="btn btn-secondary" onclick={goBack}>
          Go Back
        </button>
      {:else if status === 403}
        <button class="btn btn-primary" onclick={goToRecipes}>
          Go to Recipes
        </button>
        <button class="btn btn-secondary" onclick={goBack}>
          Go Back
        </button>
      {:else if status === 500}
        <button class="btn btn-primary" onclick={goToRecipes}>
          Go to Recipes
        </button>
        <button class="btn btn-secondary" onclick={goBack}>
          Try Again
        </button>
      {:else}
        <button class="btn btn-primary" onclick={goToRecipes}>
          Go to Recipes
        </button>
        <button class="btn btn-secondary" onclick={goBack}>
          Go Back
        </button>
      {/if}
    </div>
  </div>
</main>

<style>
  .error-page {
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-primary);
    padding: 2rem;
  }

  .error-container {
    background: var(--nord5);
    border-radius: 1rem;
    padding: 3rem;
    max-width: 600px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-container {
      background: var(--nord1);
      border-color: var(--nord2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
  }
:global(:root[data-theme="dark"]) .error-container {
	background: var(--nord1);
      border-color: var(--nord2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  .error-title {
    font-size: 2.5rem;
    color: var(--nord0);
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-title {
      color: var(--nord6);
    }
  }
:global(:root[data-theme="dark"]) .error-title {
	color: var(--nord6);
}

  .error-code {
    font-size: 1.2rem;
    color: var(--nord3);
    font-weight: 600;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-code {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .error-code {
	color: var(--nord4);
}

  .error-description {
    font-size: 1.1rem;
    color: var(--nord2);
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-description {
      color: var(--nord5);
    }
  }
:global(:root[data-theme="dark"]) .error-description {
	color: var(--nord5);
}

  .error-details {
    background: var(--nord4);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1.5rem 0;
    font-size: 0.9rem;
    color: var(--nord0);
    border-left: 4px solid var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-details {
      background: var(--nord2);
      color: var(--nord6);
    }
  }
:global(:root[data-theme="dark"]) .error-details {
	background: var(--nord2);
      color: var(--nord6);
}

  .checking-message {
    background: var(--nord4);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1.5rem 0;
    font-size: 0.9rem;
    color: var(--nord2);
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .checking-message {
      background: var(--nord2);
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .checking-message {
	background: var(--nord2);
      color: var(--nord4);
}

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--blue), var(--lightblue));
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, var(--lightblue), var(--blue));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(94, 129, 172, 0.3);
  }

  .btn-secondary {
    background: var(--nord4);
    color: var(--nord0);
    border: 1px solid var(--nord3);
  }

  .btn-secondary:hover {
    background: var(--nord3);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .btn-secondary {
      background: var(--nord2);
      color: var(--nord6);
      border-color: var(--nord3);
    }

    :global(:root:not([data-theme="light"])) .btn-secondary:hover {
      background: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .btn-secondary {
	background: var(--nord2);
      color: var(--nord6);
      border-color: var(--nord3);
}
:global(:root[data-theme="dark"]) .btn-secondary:hover {
	background: var(--nord3);
}

  @media (max-width: 600px) {
    .error-container {
      padding: 2rem;
      margin: 1rem;
    }

    .error-title {
      font-size: 2rem;
    }

    .error-actions {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      width: 100%;
      max-width: 250px;
    }
  }
</style>
