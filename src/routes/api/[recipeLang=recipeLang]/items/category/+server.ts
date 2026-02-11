import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish, briefQueryConfig } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params }) => {
  const { approvalFilter, prefix } = briefQueryConfig(params.recipeLang);
  await dbConnect();

  const field = `${prefix}category`;
  const categories = await Recipe.distinct(field, approvalFilter).lean();

  return json(JSON.parse(JSON.stringify(categories)));
};
