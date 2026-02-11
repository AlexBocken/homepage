import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params }) => {
  const { approvalFilter, prefix, projection } = briefQueryConfig(params.recipeLang);
  await dbConnect();

  const dbRecipes = await Recipe.find(
    { [`${prefix}category`]: params.category, ...approvalFilter },
    projection
  ).lean();

  const recipes = rand_array(dbRecipes.map(r => toBrief(r, params.recipeLang)));
  return json(JSON.parse(JSON.stringify(recipes)));
};
