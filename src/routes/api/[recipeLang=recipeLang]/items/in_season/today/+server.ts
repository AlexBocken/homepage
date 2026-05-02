import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { rand_array } from '$lib/js/randomize';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';
import { isRecipeInSeason } from '$lib/js/seasonRange';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, projection } = briefQueryConfig(params.recipeLang!);

  await dbConnect();

  // Same shape as the [month] endpoint: load all candidates, filter in-app
  // against the resolved liturgical anchors for the current date.
  const dbRecipes = await Recipe.find(
    { icon: { $ne: '🍽️' }, seasonRanges: { $exists: true, $ne: [] }, ...approvalFilter },
    projection
  ).lean();
  const briefs = dbRecipes.map(r => toBrief(r, params.recipeLang!));
  const today = new Date();
  const recipes = briefs.filter(r => isRecipeInSeason(r as any, today));

  // 1h browser, 1h edge, 24h SWR — anchors are stable within a day, daily
  // revalidation is fine for season transitions.
  setHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' });
  return json(rand_array(recipes));
};
