import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import type {BriefRecipeType} from '../../../../../types/types';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipes = (await Recipe.find({category: params.category}, 'name short_name images tags category icon description season').lean()) as BriefRecipeType[];
  await dbDisconnect();

  recipes = JSON.parse(JSON.stringify(recipes));
  return json(recipes);
};
