import type { PageServerLoad } from './$types';
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ url, fetch, params, locals }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category');

    // Handle both old and new tag params
    const singleTag = url.searchParams.get('tag');
    const multipleTags = url.searchParams.get('tags');
    const tags = multipleTags
        ? multipleTags.split(',').map(t => t.trim()).filter(Boolean)
        : (singleTag ? [singleTag] : []);

    const icon = url.searchParams.get('icon');

    // Handle multiple seasons
    const singleSeason = url.searchParams.get('season');
    const multipleSeasons = url.searchParams.get('seasons');
    const seasons = multipleSeasons
        ? multipleSeasons.split(',').map(s => s.trim()).filter(Boolean)
        : (singleSeason ? [singleSeason] : []);

    const favoritesOnly = url.searchParams.get('favorites') === 'true';

    // Build API URL with filters
    const apiUrl = new URL(`${apiBase}/search`, url.origin);
    if (query) apiUrl.searchParams.set('q', query);
    if (category) apiUrl.searchParams.set('category', category);

    // Pass as comma-separated to API
    if (tags.length > 0) {
        apiUrl.searchParams.set('tags', tags.join(','));
    }

    if (icon) apiUrl.searchParams.set('icon', icon);

    if (seasons.length > 0) {
        apiUrl.searchParams.set('seasons', seasons.join(','));
    }

    if (favoritesOnly) apiUrl.searchParams.set('favorites', 'true');

    try {
        // Fetch both search results and all recipes for live search
        const [searchResponse, allRecipesResponse, userFavorites] = await Promise.all([
            fetch(apiUrl.toString()),
            fetch(`${apiBase}/items/all_brief`),
            getUserFavorites(fetch, locals)
        ]);

        const results = await searchResponse.json();
        const allRecipes = await allRecipesResponse.json();

        return {
            query,
            results: searchResponse.ok ? addFavoriteStatusToRecipes(results, userFavorites) : [],
            allRecipes: addFavoriteStatusToRecipes(allRecipes, userFavorites),
            error: searchResponse.ok ? null : results.error || 'Search failed',
            filters: {
                category,
                tags, // Now an array
                icon,
                seasons, // Now an array
                favoritesOnly
            }
        };
    } catch (error) {
        return {
            query,
            results: [],
            allRecipes: [],
            error: 'Search failed',
            filters: {
                category,
                tags: [],
                icon,
                seasons: [],
                favoritesOnly
            }
        };
    }
};