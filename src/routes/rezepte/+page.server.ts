import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export async function load({ fetch, locals, parent }) {
    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`/api/rezepte/items/in_season/` + current_month);
    const res_all_brief = await fetch(`/api/rezepte/items/all_brief`);
    const item_season = await res_season.json();
    const item_all_brief = await res_all_brief.json();
    
    // Get user favorites (session comes from parent layout)
    const userFavorites = await getUserFavorites(fetch, locals);
    
    return {
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        all_brief: addFavoriteStatusToRecipes(item_all_brief, userFavorites)
    };
};
