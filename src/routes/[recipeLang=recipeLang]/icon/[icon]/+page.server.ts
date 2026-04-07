import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const [item_season, icons, userFavorites, session] = await Promise.all([
        fetch(`${apiBase}/items/icon/` + params.icon).then(r => r.json()),
        fetch(`${apiBase}/items/icon`).then(r => r.json()),
        getUserFavorites(fetch, locals, params.recipeLang),
        locals.auth()
    ]);

    return {
        icons: icons,
        icon: params.icon,
        season: addFavoriteStatusToRecipes(item_season, userFavorites),
        session
    };
};