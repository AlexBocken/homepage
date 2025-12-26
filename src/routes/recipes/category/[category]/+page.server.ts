import type { PageServerLoad } from "./$types";
import { getUserFavorites, addFavoriteStatusToRecipes } from "$lib/server/favorites";

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
	const res = await fetch(`/api/recipes/items/category/${params.category}`);
	const items = await res.json();

	// Get user favorites and session
	const [userFavorites, session] = await Promise.all([
		getUserFavorites(fetch, locals),
		locals.auth()
	]);

	return {
		category: params.category,
		recipes: addFavoriteStatusToRecipes(items, userFavorites),
		session
	};
};
