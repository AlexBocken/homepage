import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import cache from '$lib/server/cache';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params }) => {
  const { approvalFilter, prefix, projection } = briefQueryConfig(params.recipeLang);
  const cacheKey = `recipes:${params.recipeLang}:tag:${params.tag}`;

  let recipes = null;
  const cached = await cache.get(cacheKey);

  if (cached) {
    recipes = JSON.parse(cached);
  } else {
    await dbConnect();
    const dbRecipes = await Recipe.find(
      { [`${prefix}tags`]: params.tag, ...approvalFilter },
      projection
    ).lean();
    recipes = dbRecipes.map(r => toBrief(r, params.recipeLang));
    await cache.set(cacheKey, JSON.stringify(recipes), 3600);
  }

  return json(JSON.parse(JSON.stringify(rand_array(recipes))));
};
