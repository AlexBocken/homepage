import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

/**
 * Fill in `cachedPer100g` for recipes that have never had it calculated, so the
 * listing's nutrition filter works without an admin first pressing the rebuild
 * button. A recipe whose mappings yield nothing usable is written as an
 * explicit null, which is how it stays skipped afterwards — `$exists: false`
 * means "never calculated", not "nothing to calculate".
 *
 * Steady state this is one indexed query returning nothing. Editing a recipe
 * clears the field again, which is what keeps the figures honest.
 */
async function fillMissingNutritionCache(): Promise<void> {
  const missing = await Recipe.find(
    { cachedPer100g: { $exists: false } },
    { ingredients: 1, nutritionMappings: 1 }
  ).lean();
  if (missing.length === 0) return;

  // Imported here rather than at module scope: computing a recipe's nutrition
  // needs the BLS and USDA tables, ~19 MB of data between them, and this is the
  // busiest public endpoint on the site. On the normal path — every cache
  // present — they never enter this route's module graph at all.
  const { computePer100g } = await import('$lib/server/recipePer100g');

  await Recipe.bulkWrite(
    missing.map((recipe) => {
      const result = computePer100g(recipe);
      return {
        updateOne: {
          filter: { _id: recipe._id },
          update: {
            $set: {
              cachedPer100g: result?.per100g ?? null,
              cachedTotalGrams: result?.totalGrams ?? 0
            }
          }
        }
      };
    })
  );
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
