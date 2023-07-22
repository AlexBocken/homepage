import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../../../utils/db';
import type {BriefRecipeType} from '../../../../../../types/types';
import { rand_array } from '$lib/js/randomize';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipes = rand_array(await Recipe.find({category: params.category}, 'name short_name images tags category icon description season').lean()) as BriefRecipeType[];
  await dbDisconnect();

  recipes = JSON.parse(JSON.stringify(recipes));
  return json(recipes);
};
