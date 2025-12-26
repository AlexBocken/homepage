import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ fetch, params, locals}) => {
    // Edit is German-only - redirect to German version
    if (params.recipeLang === 'recipes') {
        // We need to get the German short_name first
        const res = await fetch(`/api/recipes/items/${params.name}`);
        if (res.ok) {
            const recipe = await res.json();
            throw redirect(301, `/rezepte/edit/${recipe.germanShortName}`);
        }
        // If recipe not found, redirect to German recipes list
        throw redirect(301, '/rezepte');
    }

    let current_month = new Date().getMonth() + 1
    const apiRes = await fetch(`/api/rezepte/items/${params.name}`);
    const recipe = await apiRes.json();
    const session = await locals.auth();
    return {recipe: recipe,
	user: session?.user
    };
};
