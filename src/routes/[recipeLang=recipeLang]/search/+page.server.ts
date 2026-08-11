import type { PageServerLoad } from './$types';
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

/**
 * The search page hands the whole collection to `createRecipeBrowse()` and lets
 * the filter rail do the work client-side, so all this has to do is read the
 * incoming filters off the URL and ship the recipes.
 *
 * Both parameter shapes are accepted: repeated `tag=`/`season=` (what the site
 * writes today) and comma-separated `tags=`/`seasons=` (what older bookmarks
 * and shared links carry).
 */
export const load: PageServerLoad = async ({ url, fetch, params, locals }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const list = (single: string, plural: string) => [
        ...url.searchParams.getAll(single),
        ...(url.searchParams.get(plural)?.split(',') ?? [])
    ].map((v) => v.trim()).filter(Boolean);

    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category');
    const tags = list('tag', 'tags');
    const seasons = list('season', 'seasons')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
    const icon = url.searchParams.get('icon');
    const favoritesOnly = url.searchParams.get('favorites') === 'true';

    const filters = { category, tags, icon, seasons, favoritesOnly };

    try {
        const [allRecipes, userFavorites] = await Promise.all([
            fetch(`${apiBase}/items/all_brief`).then((r) => r.json()),
            getUserFavorites(fetch, locals, params.recipeLang)
        ]);

        return {
            query,
            allRecipes: addFavoriteStatusToRecipes(allRecipes, userFavorites),
            error: null,
            filters
        };
    } catch (error) {
        return { query, allRecipes: [], error: 'Search failed', filters };
    }
};
