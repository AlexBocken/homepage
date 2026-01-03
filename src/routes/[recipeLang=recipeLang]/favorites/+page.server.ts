import type { PageServerLoad } from "./$types";
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = isEnglish ? '/api/recipes' : '/api/rezepte';
    const session = await locals.auth();

    if (!session?.user?.nickname) {
        throw redirect(302, `/${params.recipeLang}`);
    }

    try {
        const res = await fetch(`${apiBase}/favorites/recipes`);
        if (!res.ok) {
            return {
                favorites: [],
                error: 'Failed to load favorites'
            };
        }

        const favorites = await res.json();

        // Mark all favorites with isFavorite flag for filter compatibility
        const favoritesWithFlag = favorites.map(recipe => ({
            ...recipe,
            isFavorite: true
        }));

        return {
            favorites: favoritesWithFlag,
            session
        };
    } catch (e) {
        return {
            favorites: [],
            error: 'Failed to load favorites'
        };
    }
};