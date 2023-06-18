import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import type {RecipeModelType} from '../../../../types/types';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipe = (await Recipe.findOne({ short_name: params.name}).lean()) as RecipeModelType[];
  await dbDisconnect();

  recipe = JSON.parse(JSON.stringify(recipe));
  return json(recipe);
};
