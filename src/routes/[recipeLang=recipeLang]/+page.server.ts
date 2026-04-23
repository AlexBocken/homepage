import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;
    const currentMonth = new Date().getMonth() + 1;
    const session = locals.session ?? await locals.auth();

    const [res_all_brief, userFavorites] = await Promise.all([
        fetch(`${apiBase}/items/all_brief`).then(r => r.json()),
        getUserFavorites(fetch, locals, params.recipeLang)
    ]);

    const all_brief = addFavoriteStatusToRecipes(res_all_brief, userFavorites);
    // Derive seasonal subset from all_brief instead of a separate DB query
    const season = all_brief.filter((r: any) => r.season?.includes(currentMonth) && r.icon !== '🍽️');

    return {
        season,
        all_brief,
        session,
        heroIndex: Math.random()
    };
};
