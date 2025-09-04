import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export async function load({ fetch, locals }) {
    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`/api/rezepte/items/in_season/` + current_month);
    const res_all_brief = await fetch(`/api/rezepte/items/all_brief`);
    const item_season = await res_season.json();
    const item_all_brief = await res_all_brief.json();
    
    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);
    
    return {
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        all_brief: addFavoriteStatusToRecipes(item_all_brief, userFavorites),
        session
    };
};
