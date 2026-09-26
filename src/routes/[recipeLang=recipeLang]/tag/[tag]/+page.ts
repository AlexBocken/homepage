import { overlayOfflineData } from '$lib/offline/helpers';
import { getAllBriefRecipes, getBriefRecipesByTag } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, params }) => {
	return overlayOfflineData(data, {
		label: 'data',
		isEmpty: (d) => !d?.recipes?.length,
		offline: async () => {
			// The whole collection too, so the filter rail can be widened
			// past this keyword without a network round trip.
			const [recipes, allRecipes] = await Promise.all([
				getBriefRecipesByTag(params.tag),
				getAllBriefRecipes()
			]);
			return { recipes: rand_array(recipes), allRecipes };
		}
	});
};
