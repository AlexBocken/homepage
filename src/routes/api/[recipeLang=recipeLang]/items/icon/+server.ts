import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { DISTINCT_LIST_CACHE } from '$lib/server/recipeBriefs';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  await dbConnect();
  const icons = await Recipe.distinct('icon').lean();

  setHeaders({ 'Cache-Control': DISTINCT_LIST_CACHE });

  return json(icons);
};
