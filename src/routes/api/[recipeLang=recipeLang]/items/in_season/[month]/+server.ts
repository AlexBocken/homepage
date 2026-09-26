import { json, type RequestHandler } from '@sveltejs/kit';
import { rand_array } from '$lib/js/randomize';
import { findBriefs, BRIEF_LIST_CACHE, SEASONAL_CANDIDATES } from '$lib/server/recipeBriefs';
import { recipeOverlapsMonth } from '$lib/js/seasonRange';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const month = parseInt(params.month!, 10);

  // Range membership for movable anchors can't be expressed in Mongo, so we
  // load every approved (non-plate-icon) recipe with seasonRanges and filter
  // in-app. Dataset is small (~hundreds) — sub-ms.
  const briefs = await findBriefs(params.recipeLang!, SEASONAL_CANDIDATES);
  const recipes = briefs.filter(r => recipeOverlapsMonth(r as any, month));

  setHeaders({ 'Cache-Control': BRIEF_LIST_CACHE });
  return json(rand_array(recipes));
};
