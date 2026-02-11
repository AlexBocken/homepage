<script>
    import {onMount} from "svelte";
    import { browser } from '$app/environment';
    import "$lib/css/nordtheme.css";
    import FilterPanel from './FilterPanel.svelte';
    import { getCategories } from '$lib/js/categories';

    // Filter props for different contexts
    let {
        category = null,
        tag = null,
        icon = null,
        season = null,
        favoritesOnly = false,
        lang = 'de',
        recipes = [],
        onSearchResults = (matchedIds, matchedCategories) => {},
        isLoggedIn = false
    } = $props();

    // Generate categories internally based on language
    const categories = $derived(getCategories(lang));

    const isEnglish = $derived(lang === 'en');
    const searchResultsUrl = $derived(isEnglish ? '/recipes/search' : '/rezepte/search');
    const labels = $derived({
        placeholder: isEnglish ? 'Search...' : 'Suche...',
        searchTitle: isEnglish ? 'Search' : 'Suchen',
        clearTitle: isEnglish ? 'Clear search' : 'Sucheintrag löschen'
    });

    let searchQuery = $state('');
    let showFilters = $state(false);

    // Filter data loaded from APIs
    let availableTags = $state([]);
    let availableIcons = $state([]);

    // Selected filters (internal state)
    let selectedCategory = $state(null);
    let selectedTags = $state([]);
    let selectedIcon = $state(null);
    let selectedSeasons = $state([]);
    let selectedFavoritesOnly = $state(false);
    let useAndLogic = $state(true);

    // Initialize from props (for backwards compatibility)
    $effect(() => {
        selectedCategory = category || null;
        selectedTags = tag ? [tag] : [];
        selectedIcon = icon || null;
        selectedSeasons = season ? [parseInt(season)] : [];
        selectedFavoritesOnly = favoritesOnly;
    });

    // Apply non-text filters (category, tags, icon, season)
    function applyNonTextFilters(recipeList) {
        return recipeList.filter(recipe => {
            if (useAndLogic) {
                // AND mode: recipe must satisfy ALL active filters
                // Category filter (single value in AND mode)
                if (selectedCategory && recipe.category !== selectedCategory) {
                    return false;
                }

                // Multi-tag AND logic: recipe must have ALL selected tags
                if (selectedTags.length > 0) {
                    const recipeTags = recipe.tags || [];
                    if (!selectedTags.every(tag => recipeTags.includes(tag))) {
                        return false;
                    }
                }

                // Icon filter (single value in AND mode)
                if (selectedIcon && recipe.icon !== selectedIcon) {
                    return false;
                }

                // Season filter: recipe in any selected season
                if (selectedSeasons.length > 0) {
                    const recipeSeasons = recipe.season || [];
                    if (!selectedSeasons.some(s => recipeSeasons.includes(s))) {
                        return false;
                    }
                }

                // Favorites filter
                if (selectedFavoritesOnly && !recipe.isFavorite) {
                    return false;
                }

                return true;
            } else {
                // OR mode: recipe must satisfy AT LEAST ONE active filter
                const categoryArray = Array.isArray(selectedCategory) ? selectedCategory : (selectedCategory ? [selectedCategory] : []);
                const iconArray = Array.isArray(selectedIcon) ? selectedIcon : (selectedIcon ? [selectedIcon] : []);

                const hasActiveFilters = categoryArray.length > 0 || selectedTags.length > 0 || iconArray.length > 0 || selectedSeasons.length > 0 || selectedFavoritesOnly;

                // If no filters active, return all
                if (!hasActiveFilters) {
                    return true;
                }

                // Check if recipe matches any filter
                const matchesCategory = categoryArray.length > 0 ? categoryArray.includes(recipe.category) : false;
                const matchesTags = selectedTags.length > 0 ? selectedTags.some(tag => (recipe.tags || []).includes(tag)) : false;
                const matchesIcon = iconArray.length > 0 ? iconArray.includes(recipe.icon) : false;
                const matchesSeasons = selectedSeasons.length > 0 ? selectedSeasons.some(s => (recipe.season || []).includes(s)) : false;
                const matchesFavorites = selectedFavoritesOnly ? recipe.isFavorite : false;

                return matchesCategory || matchesTags || matchesIcon || matchesSeasons || matchesFavorites;
            }
        });
    }

    // Perform search directly (no worker)
    function performSearch(query) {
        // Apply non-text filters first
        const filteredByNonText = applyNonTextFilters(recipes);

        // Empty query = show all (filtered) recipes
        if (!query || query.trim().length === 0) {
            onSearchResults(
                new Set(filteredByNonText.map(r => r._id)),
                new Set(filteredByNonText.map(r => r.category))
            );
            return;
        }

        // Normalize and split search query
        const searchText = query.toLowerCase().trim()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, "");
        const searchTerms = searchText.split(" ").filter(term => term.length > 0);

        // Filter recipes by text
        const matched = filteredByNonText.filter(recipe => {
            // Build searchable string from recipe data
            const searchString = [
                recipe.name || '',
                recipe.description || '',
                ...(recipe.tags || [])
            ].join(' ')
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, "")
                .replace(/&shy;|­/g, ''); // Remove soft hyphens

            // All search terms must match
            return searchTerms.every(term => searchString.includes(term));
        });

        // Return matched recipe IDs and categories
        onSearchResults(
            new Set(matched.map(r => r._id)),
            new Set(matched.map(r => r.category))
        );
    }

    // Build search URL with current filters
    function buildSearchUrl(query) {
        if (browser) {
            const url = new URL(searchResultsUrl, window.location.origin);
            if (query) url.searchParams.set('q', query);
            if (selectedCategory) url.searchParams.set('category', selectedCategory);

            // Multiple tags: use comma-separated format
            if (selectedTags.length > 0) {
                url.searchParams.set('tags', selectedTags.join(','));
            }

            if (selectedIcon) url.searchParams.set('icon', selectedIcon);

            // Multiple seasons: use comma-separated format
            if (selectedSeasons.length > 0) {
                url.searchParams.set('seasons', selectedSeasons.join(','));
            }

            if (selectedFavoritesOnly) url.searchParams.set('favorites', 'true');
            return url.toString();
        } else {
            // Server-side fallback - return just the base path
            return searchResultsUrl;
        }
    }

    // Filter change handlers - the effect will automatically trigger search
    function handleCategoryChange(newCategory) {
        selectedCategory = newCategory;
    }

    function handleTagToggle(tag) {
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
        } else {
            selectedTags = [...selectedTags, tag];
        }
    }

    function handleIconChange(newIcon) {
        selectedIcon = newIcon;
    }

    function handleSeasonChange(newSeasons) {
        selectedSeasons = newSeasons;
    }

    function handleFavoritesToggle(enabled) {
        selectedFavoritesOnly = enabled;
    }

    function handleLogicModeToggle(useAnd) {
        useAndLogic = useAnd;

        // When switching to AND mode, convert arrays to single values
        if (useAnd) {
            if (Array.isArray(selectedCategory)) {
                selectedCategory = selectedCategory.length > 0 ? selectedCategory[0] : null;
            }
            if (Array.isArray(selectedIcon)) {
                selectedIcon = selectedIcon.length > 0 ? selectedIcon[0] : null;
            }
        }
    }

    function handleSubmit(event) {
        if (browser) {
            // For JS-enabled browsers, prevent default and navigate programmatically
            const url = buildSearchUrl(searchQuery);
            window.location.href = url;
        }
        // If no JS, form will submit normally
    }

    function clearSearch() {
        searchQuery = '';
        performSearch('');
    }

    // Debounced search effect - triggers search when query or filters change
    $effect(() => {
        if (browser && recipes.length > 0) {
            // Read all dependencies to track them
            const query = searchQuery;
            const cat = selectedCategory;
            const tags = selectedTags;
            const icn = selectedIcon;
            const seasons = selectedSeasons;
            const favsOnly = selectedFavoritesOnly;
            const andLogic = useAndLogic;

            // Set debounce timer
            const timer = setTimeout(() => {
                performSearch(query);
            }, 100);

            // Cleanup function - clear timer on re-run or unmount
            return () => clearTimeout(timer);
        }
    });

    // Load filter data reactively when language changes
    $effect(() => {
        const loadFilterData = async () => {
            try {
                const apiBase = `/api/${isEnglish ? 'recipes' : 'rezepte'}`;
                const [tagsRes, iconsRes] = await Promise.all([
                    fetch(`${apiBase}/items/tag`),
                    fetch('/api/rezepte/items/icon')
                ]);
                availableTags = await tagsRes.json();
                availableIcons = await iconsRes.json();
            } catch (error) {
                console.error('Failed to load filter data:', error);
            }
        };

        loadFilterData();
    });

    onMount(async () => {
        // Swap buttons for JS-enabled experience
        const submitButton = document.getElementById('submit-search');
        const clearButton = document.getElementById('clear-search');

        if (submitButton && clearButton) {
            submitButton.style.display = 'none';
            clearButton.style.display = 'flex';
        }

        // Enable filter panel for JS-enabled browsers
        showFilters = true;

        // Get initial search value from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = urlParams.get('q');
        if (urlQuery) {
            searchQuery = urlQuery;
        } else {
            // Show all recipes initially
            performSearch('');
        }
    });

</script>
<style>
input#search {
  all: unset;
  box-sizing: border-box;
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
  {#if selectedCategory}<input type="hidden" name="category" value={selectedCategory} />{/if}
  {#each selectedTags as tag}
    <input type="hidden" name="tag" value={tag} />
  {/each}
  {#if selectedIcon}<input type="hidden" name="icon" value={selectedIcon} />{/if}
  {#each selectedSeasons as season}
    <input type="hidden" name="season" value={season} />
  {/each}
  {#if selectedFavoritesOnly}<input type="hidden" name="favorites" value="true" />{/if}

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

{#if showFilters}
  <FilterPanel
    availableCategories={categories}
    {availableTags}
    {availableIcons}
    {selectedCategory}
    {selectedTags}
    {selectedIcon}
    {selectedSeasons}
    {selectedFavoritesOnly}
    {useAndLogic}
    {lang}
    {isLoggedIn}
    hideFavoritesFilter={favoritesOnly}
    onCategoryChange={handleCategoryChange}
    onTagToggle={handleTagToggle}
    onIconChange={handleIconChange}
    onSeasonChange={handleSeasonChange}
    onFavoritesToggle={handleFavoritesToggle}
    onLogicModeToggle={handleLogicModeToggle}
  />
{/if}
