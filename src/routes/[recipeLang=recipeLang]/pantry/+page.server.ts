import type { PageServerLoad } from './$types';
import type { PantryIndex } from '$lib/js/pantryMatch';
import type { BriefRecipeType } from '$types/types';
import { getUserFavorites, addFavoriteStatusToRecipes } from '$lib/server/favorites';

/**
 * "Was kann ich kochen?" — ships the pantry index and the recipe cards; the page
 * does the matching itself ($lib/js/pantryMatch), so every chip toggled updates
 * the results without a round trip. `?have=` carries the picked ingredients as
 * German keys, which makes a link work on both language pages.
 */
export const load: PageServerLoad = async ({ url, fetch, params, locals }) => {
    const apiBase = `/api/${params.recipeLang}`;
    const have = (url.searchParams.get('have') ?? '')
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

    const [pantry, recipes, favorites] = await Promise.all([
        fetch(`${apiBase}/items/pantry`).then((r) => r.json() as Promise<PantryIndex>),
        fetch(`${apiBase}/items/all_brief`).then((r) => r.json() as Promise<BriefRecipeType[]>),
        getUserFavorites(fetch, locals, params.recipeLang)
    ]);

    // Favourite status drives the rail's favourites filter and the cards' hearts.
    return { pantry, recipes: addFavoriteStatusToRecipes(recipes, favorites), have };
};
