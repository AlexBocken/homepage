import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const res_season = await fetch(`/api/rezepte/items/in_season/` + params.month);
    const item_season = await res_season.json();
    
    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);
    
    return {
        month: params.month,
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};