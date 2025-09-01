import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const res_season = await fetch(`/api/rezepte/items/icon/` + params.icon);
    const res_icons = await fetch(`/api/rezepte/items/icon`);
    const icons = await res_icons.json();
    const item_season = await res_season.json();
    
    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);
    
    return {
        icons: icons,
        icon: params.icon,
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};