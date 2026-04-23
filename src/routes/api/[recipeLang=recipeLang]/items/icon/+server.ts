import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type {BriefRecipeType} from '$types/types';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  const icons = await Recipe.distinct('icon').lean();

  return json(icons);
};
