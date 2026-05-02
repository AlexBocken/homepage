import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";
import { isRecipeInSeason } from "$lib/js/seasonRange";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;
    const session = locals.session ?? await locals.auth();

    const [res_all_brief, userFavorites] = await Promise.all([
        fetch(`${apiBase}/items/all_brief`).then(r => r.json()),
        getUserFavorites(fetch, locals, params.recipeLang)
    ]);

    const all_brief = addFavoriteStatusToRecipes(res_all_brief, userFavorites);
    const today = new Date();
    const season = all_brief.filter((r: any) => r.icon !== '🍽️' && isRecipeInSeason(r, today));

    return {
        season,
        all_brief,
        session,
        heroIndex: Math.random()
    };
};
