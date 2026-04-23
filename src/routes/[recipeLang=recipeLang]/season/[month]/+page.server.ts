import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const res_season = await fetch(`${apiBase}/items/in_season/` + params.month);
    const item_season = await res_season.json();

    const session = locals.session ?? await locals.auth();
    const userFavorites = await getUserFavorites(fetch, locals, params.recipeLang);

    return {
        month: params.month,
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};