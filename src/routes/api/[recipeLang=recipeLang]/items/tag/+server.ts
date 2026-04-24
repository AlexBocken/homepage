import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish, briefQueryConfig } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter } = briefQueryConfig(params.recipeLang!);
  await dbConnect();

  // Same cache budget as /items/category — distinct-values list that only
  // changes on recipe edit.
  setHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' });

  if (isEnglish(params.recipeLang!)) {
    const recipes = await Recipe.find(approvalFilter, 'translations.en.tags').lean();
    const tagsSet = new Set<string>();
    recipes.forEach(recipe => {
      if (recipe.translations?.en?.tags) {
        recipe.translations.en.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    return json(Array.from(tagsSet).sort());
  }

  const tags = await Recipe.distinct('tags').lean();
  return json(tags);
};
