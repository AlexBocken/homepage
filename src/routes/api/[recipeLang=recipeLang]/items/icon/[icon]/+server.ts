import { json, type RequestHandler } from '@sveltejs/kit';
import { rand_array } from '$lib/js/randomize';
import { findBriefs, BRIEF_LIST_CACHE } from '$lib/server/recipeBriefs';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const briefs = await findBriefs(params.recipeLang!, { icon: params.icon });
  setHeaders({ 'Cache-Control': BRIEF_LIST_CACHE });
  return json(rand_array(briefs));
};
