import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, projection } = briefQueryConfig(params.recipeLang!);

  await dbConnect();
  const dbRecipes = await Recipe.find(
    { season: parseInt(params.month!, 10), icon: { $ne: "🍽️" }, ...approvalFilter },
    projection
  ).lean();
  const recipes = dbRecipes.map(r => toBrief(r, params.recipeLang!));

  // rand_array is seeded per UTC day, same for every caller → cacheable.
  setHeaders({ 'Cache-Control': 'public, max-age=28800, s-maxage=28800, stale-while-revalidate=86400' });
  return json(rand_array(recipes));
};
