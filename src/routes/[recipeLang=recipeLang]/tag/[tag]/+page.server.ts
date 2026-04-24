import type { PageServerLoad} from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const session = locals.session ?? await locals.auth();
    const [res_tag, allRes, userFavorites] = await Promise.all([
        fetch(`${apiBase}/items/tag/${params.tag}`),
        fetch(`${apiBase}/items/all_brief`),
        getUserFavorites(fetch, locals, params.recipeLang)
    ]);

    const [items_tag, allRecipes] = await Promise.all([res_tag.json(), allRes.json()]);

    return {
        tag: params.tag,
        recipes: addFavoriteStatusToRecipes(items_tag, userFavorites),
        allRecipes: addFavoriteStatusToRecipes(allRecipes, userFavorites),
        session
    };
};