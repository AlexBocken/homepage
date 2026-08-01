import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

/**
 * Top up any recipe whose nutrition cache was cleared by an edit since the
 * server started. Startup warms the whole collection (see hooks.server.ts), so
 * in the steady state this is one query that returns nothing.
 *
 * Dynamic import on purpose: calculating nutrition needs the BLS and USDA
 * tables, ~19 MB between them, and this is the busiest public endpoint on the
 * site. On the normal path they never enter this route's module graph.
 */
async function fillMissingNutritionCache(): Promise<void> {
  const missing = await Recipe.countDocuments({ cachedPer100g: { $exists: false } });
  if (missing === 0) return;
  const { fillMissingRecipeNutrition } = await import('$lib/server/recipeNutritionCache');
  await fillMissingRecipeNutrition();
}

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, projection } = briefQueryConfig(params.recipeLang!);

  await dbConnect();
  try {
    await fillMissingNutritionCache();
  } catch (e) {
    // A listing is still worth serving without macro data.
    console.error('Failed to fill recipe nutrition cache:', e);
  }
  const dbRecipes = await Recipe.find(approvalFilter, projection).lean();
  const recipes = dbRecipes.map(r => toBrief(r, params.recipeLang!));

  // rand_array is seeded by `floor(now / 86400000)` — stable for a full UTC
  // day across every caller — so the response is safe to share. 8 h browser +
  // 8 h edge cache means at worst the shuffle rolls into the next day a few
  // hours late; with SWR the stale payload still ships while a fresh one is
  // computed.
  setHeaders({ 'Cache-Control': 'public, max-age=28800, s-maxage=28800, stale-while-revalidate=86400' });

  return json(rand_array(recipes));
};
