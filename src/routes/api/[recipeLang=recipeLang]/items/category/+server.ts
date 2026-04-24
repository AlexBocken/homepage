import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish, briefQueryConfig } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const { approvalFilter, prefix } = briefQueryConfig(params.recipeLang!);
  await dbConnect();

  const field = `${prefix}category`;
  const categories = await Recipe.distinct(field, approvalFilter).lean();

  // Distinct category list changes only on recipe add/edit. 1 h browser cache +
  // 1 d edge cache with SWR keeps the chip bar snappy; worst case a newly
  // added category shows up an hour late.
  setHeaders({ 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' });

  return json(categories);
};
