import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`${apiBase}/items/in_season/` + current_month);
    const item_season = await res_season.json();

    const session = locals.session ?? await locals.auth();
    const userFavorites = await getUserFavorites(fetch, locals, params.recipeLang);

    return {
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};