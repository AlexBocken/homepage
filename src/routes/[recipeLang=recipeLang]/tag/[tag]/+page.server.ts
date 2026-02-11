import type { PageServerLoad} from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;

    const res_tag = await fetch(`${apiBase}/items/tag/${params.tag}`);
    const items_tag = await res_tag.json();

    // Get user favorites and session
    const [userFavorites, session] = await Promise.all([
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);

    return {
        tag: params.tag,
        recipes: addFavoriteStatusToRecipes(items_tag, userFavorites),
        session
    };
};