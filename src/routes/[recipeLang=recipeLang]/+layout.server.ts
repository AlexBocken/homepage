import type { LayoutServerLoad } from "./$types"
import { error } from "@sveltejs/kit";

export const load : LayoutServerLoad = async ({locals, params}) => {
	// Validate recipeLang parameter
	if (params.recipeLang !== 'rezepte' && params.recipeLang !== 'recipes') {
		throw error(404, 'Not found');
	}

	const lang = params.recipeLang === 'recipes' ? 'en' : 'de';

	return {
		session: await locals.auth(),
		lang,
		recipeLang: params.recipeLang
	}
};
