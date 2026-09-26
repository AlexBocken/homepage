import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { briefQueryConfig } from '$lib/server/recipeHelpers';
import { DISTINCT_LIST_CACHE } from '$lib/server/recipeBriefs';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, prefix } = briefQueryConfig(params.recipeLang!);
  await dbConnect();

  const field = `${prefix}category`;
  const categories = await Recipe.distinct(field, approvalFilter).lean();

  setHeaders({ 'Cache-Control': DISTINCT_LIST_CACHE });

  return json(categories);
};
