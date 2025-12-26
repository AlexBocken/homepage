import { redirect } from "@sveltejs/kit";

export async function load({locals, params}) {
    // Add is German-only - redirect to German version
    if (params.recipeLang === 'recipes') {
        throw redirect(301, '/rezepte/add');
    }

    const session = await locals.auth();
    return {
	user: session?.user
    };
};
