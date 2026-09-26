import { json, type RequestHandler } from '@sveltejs/kit';
import { rand_array } from '$lib/js/randomize';
import { findBriefs, SEASONAL_CANDIDATES } from '$lib/server/recipeBriefs';
import { isRecipeInSeason } from '$lib/js/seasonRange';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  // Same shape as the [month] endpoint: load all candidates, filter in-app
  // against the resolved liturgical anchors for the current date.
  const briefs = await findBriefs(params.recipeLang!, SEASONAL_CANDIDATES);
  const today = new Date();
  const recipes = briefs.filter(r => isRecipeInSeason(r as any, today));

  // 1h browser, 1h edge, 24h SWR — anchors are stable within a day, daily
  // revalidation is fine for season transitions.
  setHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' });
  return json(rand_array(recipes));
};
