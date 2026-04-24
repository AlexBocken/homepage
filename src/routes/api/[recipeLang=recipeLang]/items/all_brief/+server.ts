import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, projection } = briefQueryConfig(params.recipeLang!);

  await dbConnect();
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
