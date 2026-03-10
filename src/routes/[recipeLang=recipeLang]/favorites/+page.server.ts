import type { PageServerLoad } from "./$types";
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;
    const session = await locals.auth();

    if (!session?.user?.nickname) {
        const callbackUrl = encodeURIComponent(`/${params.recipeLang}/favorites`);
        throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
    }

    try {
        const [res, allRes] = await Promise.all([
            fetch(`${apiBase}/favorites/recipes`),
            fetch(`${apiBase}/items/all_brief`)
        ]);

        if (!res.ok) {
            return {
                favorites: [],
                allRecipes: [],
                error: 'Failed to load favorites'
            };
        }

        const [favorites, allRecipes] = await Promise.all([res.json(), allRes.json()]);

        // Mark all favorites with isFavorite flag for filter compatibility
        const favoritesWithFlag = favorites.map((recipe: any) => ({
            ...recipe,
            isFavorite: true
        }));

        // Get favorite IDs for marking in allRecipes
        const favoriteIds = new Set(favoritesWithFlag.map((r: any) => r._id));
        const allRecipesWithFavorites = allRecipes.map((recipe: any) => ({
            ...recipe,
            isFavorite: favoriteIds.has(recipe._id)
        }));

        return {
            favorites: favoritesWithFlag,
            allRecipes: allRecipesWithFavorites,
            session
        };
    } catch (e) {
        return {
            favorites: [],
            allRecipes: [],
            error: 'Failed to load favorites'
        };
    }
};