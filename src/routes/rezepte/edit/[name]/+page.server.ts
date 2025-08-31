import type { PageServerLoad } from "./$types";

export async function load({ fetch, params, locals}) {
    let current_month = new Date().getMonth() + 1
    const res = await fetch(`/api/rezepte/items/${params.name}`);
    const recipe = await res.json();
    const session = await locals.auth();
    return {recipe: recipe,
	user: session?.user
    };
};
