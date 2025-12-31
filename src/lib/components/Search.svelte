<script>
    import {onMount, onDestroy} from "svelte";
    import { browser } from '$app/environment';
    import "$lib/css/nordtheme.css";

    // Filter props for different contexts
    let {
        category = null,
        tag = null,
        icon = null,
        season = null,
        favoritesOnly = false,
        lang = 'de',
        recipes = [],
        onSearchResults = (matchedIds, matchedCategories) => {}
    } = $props();

    const isEnglish = $derived(lang === 'en');
    const searchResultsUrl = $derived(isEnglish ? '/recipes/search' : '/rezepte/search');
    const labels = $derived({
        placeholder: isEnglish ? 'Search...' : 'Suche...',
        searchTitle: isEnglish ? 'Search' : 'Suchen',
        clearTitle: isEnglish ? 'Clear search' : 'Sucheintrag löschen'
    });

    let searchQuery = $state('');
    let worker = $state(null);
    let isWorkerReady = $state(false);

    // Build search URL with current filters
    function buildSearchUrl(query) {
        if (browser) {
            const url = new URL(searchResultsUrl, window.location.origin);
            if (query) url.searchParams.set('q', query);
            if (category) url.searchParams.set('category', category);
            if (tag) url.searchParams.set('tag', tag);
            if (icon) url.searchParams.set('icon', icon);
            if (season) url.searchParams.set('season', season);
            if (favoritesOnly) url.searchParams.set('favorites', 'true');
            return url.toString();
        } else {
            // Server-side fallback - return just the base path
            return searchResultsUrl;
        }
    }
    
    function handleSubmit(event) {
        if (browser) {
            // For JS-enabled browsers, prevent default and navigate programmatically
            // This allows for future enhancements like instant search
            const url = buildSearchUrl(searchQuery);
            window.location.href = url;
        }
        // If no JS, form will submit normally
    }
    
    function clearSearch() {
        searchQuery = '';
        // Trigger search with empty query to show all results
        if (worker && isWorkerReady) {
            worker.postMessage({
                type: 'search',
                data: { query: '' }
            });
        }
    }

    // Effect to update worker data when recipes change (e.g., language switch)
    $effect(() => {
        if (worker && isWorkerReady && browser && recipes.length > 0) {
            worker.postMessage({
                type: 'init',
                data: { recipes }
            });
        }
    });

    // Effect to trigger search when query changes
    $effect(() => {
        if (worker && isWorkerReady && browser) {
            worker.postMessage({
                type: 'search',
                data: { query: searchQuery }
            });
        }
    });

    onMount(() => {
        // Swap buttons for JS-enabled experience
        const submitButton = document.getElementById('submit-search');
        const clearButton = document.getElementById('clear-search');

        if (submitButton && clearButton) {
            submitButton.style.display = 'none';
            clearButton.style.display = 'flex';
        }

        // Get initial search value from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = urlParams.get('q');
        if (urlQuery) {
            searchQuery = urlQuery;
        }

        // Initialize Web Worker for search
        if (recipes.length > 0) {
            worker = new Worker(
                new URL('./search.worker.js', import.meta.url),
                { type: 'module' }
            );

            // Handle messages from worker
            worker.onmessage = (e) => {
                const { type, matchedIds, matchedCategories } = e.data;

                if (type === 'ready') {
                    isWorkerReady = true;
                    // Perform initial search if URL had query
                    if (urlQuery) {
                        worker.postMessage({
                            type: 'search',
                            data: { query: urlQuery }
                        });
                    } else {
                        // Show all recipes initially
                        worker.postMessage({
                            type: 'search',
                            data: { query: '' }
                        });
                    }
                }

                if (type === 'results') {
                    // Pass results to parent component
                    onSearchResults(new Set(matchedIds), matchedCategories);
                }
            };

            // Initialize worker with recipe data
            worker.postMessage({
                type: 'init',
                data: { recipes }
            });
        }
    });

    onDestroy(() => {
        // Clean up worker
        if (worker) {
            worker.terminate();
        }
    });

</script>
<style>
input#search {
  all: unset;
  font-family: sans-serif;
  background: var(--nord0);
  color: #fff;
  padding: 0.7rem 2rem;
  border-radius: 1000px;
  width: 100%;
}
input::placeholder{
  color: var(--nord6);
}

.search {
  width: 500px;
  max-width: 85vw;
  position: relative;
  margin: 2.5rem auto 1.2rem;
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  transition: 100ms;
  filter: drop-shadow(0.4em  0.5em 0.4em rgba(0,0,0,0.4))
}

.search:hover,
.search:focus-within
{
	scale: 1.02 1.02;
  	filter: drop-shadow(0.4em  0.5em 1em rgba(0,0,0,0.6))
}
.search-button {
  all: unset;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  right: 0.5em;
  width: 1.5em;
  height: 1.5em;
  color: var(--nord6);
  cursor: pointer;
  transition: color 180ms ease-in-out;
}
.search-button:hover {
  color: white;
  scale: 1.1 1.1;
}
.search-button:active{
transition: 50ms;
scale: 0.8 0.8;
}
.search-button svg {
  width: 100%;
  height: 100%;
}
</style>
<form class="search" method="get" action={buildSearchUrl('')} onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
  {#if category}<input type="hidden" name="category" value={category} />{/if}
  {#if tag}<input type="hidden" name="tag" value={tag} />{/if}
  {#if icon}<input type="hidden" name="icon" value={icon} />{/if}
  {#if season}<input type="hidden" name="season" value={season} />{/if}
  {#if favoritesOnly}<input type="hidden" name="favorites" value="true" />{/if}
  
  <input type="text" id="search" name="q" placeholder={labels.placeholder} bind:value={searchQuery}>

  <!-- Submit button (visible by default, hidden when JS loads) -->
  <button type="submit" id="submit-search" class="search-button" style="display: flex;">
	  <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512" style="width: 100%; height: 100%;"><title>{labels.searchTitle}</title><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="m338.29 338.29 105.25 105.25"></path></svg>
  </button>

  <!-- Clear button (hidden by default, shown when JS loads) -->
  <button type="button" id="clear-search" class="search-button js-only" style="display: none;" onclick={clearSearch}>
	  <svg  xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><title>{labels.clearTitle}</title><path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"></path></svg>
  </button>
</form>
