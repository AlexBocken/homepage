import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch, params }) => {
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
        const response = await fetch(apiUrl.toString());
        const results = await response.json();
        
        return {
            query,
            results: response.ok ? results : [],
            error: response.ok ? null : results.error || 'Search failed',
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