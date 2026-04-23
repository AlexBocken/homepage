import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const session = locals.session ?? await locals.auth();
    const [res, allRes, userFavorites] = await Promise.all([
        fetch(`${apiBase}/items/category/${params.category}`),
        fetch(`${apiBase}/items/all_brief`),
        getUserFavorites(fetch, locals, params.recipeLang)
    ]);

    const [items, allRecipes] = await Promise.all([res.json(), allRes.json()]);

    return {
        category: params.category,
        recipes: addFavoriteStatusToRecipes(items, userFavorites),
        allRecipes: addFavoriteStatusToRecipes(allRecipes, userFavorites),
        session
    };
};