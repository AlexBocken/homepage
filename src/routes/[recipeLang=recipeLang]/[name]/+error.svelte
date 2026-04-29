<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ErrorView from '$lib/components/ErrorView.svelte';
  import { getErrorTitle, getErrorDescription, errorLabels, pick } from '$lib/js/errorStrings';

  let status = $derived($page.status);
  let error = $derived($page.error as any);
  let recipeLang = $derived($page.params.recipeLang);
  let recipeName = $derived($page.params.name);
  let user = $derived($page.data?.session?.user);

  let isEnglishRoute = $derived(recipeLang === 'recipes');
  let isEnglish = $derived(error?.lang === 'en' || isEnglishRoute);
  let bibleQuote = $derived(error?.bibleQuote);

  let germanRecipeExists = $state(false);
  let checkingGermanRecipe = $state(false);

  onMount(async () => {
    if (isEnglishRoute && status === 404) {
      checkingGermanRecipe = true;
      try {
        const response = await fetch(`/api/rezepte/items/${recipeName}`);
        germanRecipeExists = response.ok;
      } catch {
        germanRecipeExists = false;
      } finally {
        checkingGermanRecipe = false;
      }
    }
  });

  let showGermanFallback = $derived(
    status === 404 && isEnglishRoute && germanRecipeExists && !checkingGermanRecipe
  );

  let title = $derived(
    status === 404 ? (isEnglish ? 'Recipe Not Found' : 'Rezept nicht gefunden')
                   : getErrorTitle(status, isEnglish)
  );

  let description = $derived(
    showGermanFallback
      ? 'This recipe has not been translated to English yet, but the German version is available.'
      : status === 404
        ? (isEnglish ? 'The requested recipe could not be found.' : 'Das angeforderte Rezept konnte nicht gefunden werden.')
        : getErrorDescription(status, isEnglish)
  );

  let details = $derived(
    checkingGermanRecipe
      ? (isEnglish ? 'Checking for German version…' : 'Suche nach deutscher Version…')
      : error?.details
  );

  let recipesHref = $derived(resolve('/[recipeLang=recipeLang]', { recipeLang: isEnglishRoute ? 'recipes' : 'rezepte' }));

  function viewGermanRecipe() { goto(`/rezepte/${recipeName}`); }
  function editToTranslate() { goto(`/rezepte/edit/${recipeName}`); }
  function goBack() {
    if (window.history.length > 1) window.history.back();
    else goto(recipesHref);
  }
  function login() { goto('/login'); }
</script>

<svelte:head>
  <title>{title} — Alexander's Website</title>
</svelte:head>

<ErrorView {status} {title} {description} {details} {bibleQuote} {isEnglish}>
  {#snippet actions()}
    {#if status === 401}
      <button class="link link-primary" onclick={login}>{pick(errorLabels.login, isEnglish)}</button>
      <a class="link" href={recipesHref}>{isEnglish ? 'Recipes' : 'Rezepte'}</a>
    {:else if showGermanFallback}
      <button class="link link-primary" onclick={viewGermanRecipe}>View German recipe</button>
      {#if user}
        <button class="link" onclick={editToTranslate}>Edit to translate</button>
      {/if}
      <a class="link" href={recipesHref}>Recipes</a>
    {:else if status === 500}
      <button class="link link-primary" onclick={goBack}>{pick(errorLabels.tryAgain, isEnglish)}</button>
      <a class="link" href={recipesHref}>{isEnglish ? 'Recipes' : 'Rezepte'}</a>
    {:else}
      <a class="link link-primary" href={recipesHref}>{isEnglish ? 'Recipes' : 'Rezepte'}</a>
      <button class="link" onclick={goBack}>{pick(errorLabels.goBack, isEnglish)}</button>
    {/if}
  {/snippet}
</ErrorView>
