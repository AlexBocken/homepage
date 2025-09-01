import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals }) => {
    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`/api/rezepte/items/in_season/` + current_month);
    const item_season = await res_season.json();
    
    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);
    
    return {
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};