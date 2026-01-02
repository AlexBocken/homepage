import type { PageServerLoad } from './$types';
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ url, fetch, params, locals }) => {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = isEnglish ? '/api/recipes' : '/api/rezepte';

    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag');
    const icon = url.searchParams.get('icon');
    const season = url.searchParams.get('season');
    const favoritesOnly = url.searchParams.get('favorites') === 'true';

    // Build API URL with filters
    const apiUrl = new URL(`${apiBase}/search`, url.origin);
    if (query) apiUrl.searchParams.set('q', query);
    if (category) apiUrl.searchParams.set('category', category);
    if (tag) apiUrl.searchParams.set('tag', tag);
    if (icon) apiUrl.searchParams.set('icon', icon);
    if (season) apiUrl.searchParams.set('season', season);
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
                tag,
                icon,
                season,
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
                tag,
                icon,
                season,
                favoritesOnly
            }
        };
    }
};