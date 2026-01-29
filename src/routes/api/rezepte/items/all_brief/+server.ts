import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '../../../../../types/types';
import { Recipe } from '../../../../../models/Recipe'
import { dbConnect } from '../../../../../utils/db';
import { rand_array } from '$lib/js/randomize';
import cache from '$lib/server/cache';

export const GET: RequestHandler = async ({params}) => {
  const cacheKey = 'recipes:all_brief';

  // Try cache first
  let recipes: BriefRecipeType[] | null = null;
  const cached = await cache.get(cacheKey);

  if (cached) {
    recipes = JSON.parse(cached);
  } else {
    // Cache miss - fetch from DB
    await dbConnect();
    const dbRecipes = await Recipe.find({}, 'name short_name tags category icon description season dateModified images').lean() as BriefRecipeType[];

    // Only include first image's alt and mediapath to reduce payload
    recipes = dbRecipes.map(recipe => ({
      ...recipe,
      images: recipe.images?.[0]
        ? [{ alt: recipe.images[0].alt, mediapath: recipe.images[0].mediapath }]
        : []
    })) as BriefRecipeType[];

    // Store in cache (1 hour TTL)
    await cache.set(cacheKey, JSON.stringify(recipes), 3600);
  }

  // Apply randomization after fetching (so each request gets different order)
  const randomized = rand_array(recipes);
  return json(JSON.parse(JSON.stringify(randomized)));
};
