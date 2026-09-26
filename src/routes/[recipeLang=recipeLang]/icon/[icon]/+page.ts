import { overlayOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesByIcon, getAllBriefRecipes } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, params }) => {
	return overlayOfflineData(data, {
		label: 'data',
		isEmpty: (d) => !d?.season?.length,
		offline: async () => {
			const [recipes, allRecipes] = await Promise.all([
				getBriefRecipesByIcon(params.icon),
				getAllBriefRecipes()
			]);

			// Extract unique icons from all recipes
			const iconSet = new Set<string>();
			for (const recipe of allRecipes) {
				if (recipe.icon) {
					iconSet.add(recipe.icon);
				}
			}

			return { season: rand_array(recipes), icons: Array.from(iconSet).sort() };
		}
	});
};
