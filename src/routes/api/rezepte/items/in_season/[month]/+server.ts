import type {rand_array} from '$lib/js/randomize';
import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe'
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import cache from '$lib/server/cache';

export const GET: RequestHandler = async ({params}) => {
  const cacheKey = `recipes:in_season:${params.month}`;

  // Try cache first
  let recipes = null;
  const cached = await cache.get(cacheKey);

  if (cached) {
    recipes = JSON.parse(cached);
  } else {
    // Cache miss - fetch from DB
    await dbConnect();
    recipes = await Recipe.find({season: params.month, icon: {$ne: "🍽️"}}, 'name short_name images tags category icon description season dateModified').lean();

    // Store in cache (1 hour TTL)
    await cache.set(cacheKey, JSON.stringify(recipes), 3600);
  }

  // Apply randomization after fetching (so each request gets different order)
  const randomized = rand_array(recipes);
  return json(JSON.parse(JSON.stringify(randomized)));
};
