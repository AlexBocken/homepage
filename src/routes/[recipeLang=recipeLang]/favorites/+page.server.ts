import type { PageServerLoad } from "./$types";
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
    const apiBase = `/api/${params.recipeLang}`;
    const session = locals.session ?? await locals.auth();

    if (!session?.user?.nickname) {
        const callbackUrl = encodeURIComponent(`/${params.recipeLang}/favorites`);
        throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
    }

    try {
        const res = await fetch(`${apiBase}/favorites/recipes`);

        if (!res.ok) {
            return {
                favorites: [],
                error: 'Failed to load favorites'
            };
        }

        const favorites = await res.json();

        return {
            favorites: favorites.map((recipe: any) => ({ ...recipe, isFavorite: true })),
            session
        };
    } catch (e) {
        return {
            favorites: [],
            error: 'Failed to load favorites'
        };
    }
};
