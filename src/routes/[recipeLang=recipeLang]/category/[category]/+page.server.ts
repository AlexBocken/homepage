import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = isEnglish ? '/api/recipes' : '/api/rezepte';

    const res = await fetch(`${apiBase}/items/category/${params.category}`);
    const items = await res.json();

    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);

    return {
        category: params.category,
        recipes: addFavoriteStatusToRecipes(items, userFavorites),
        session
    };
};