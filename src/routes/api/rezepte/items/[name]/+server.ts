import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';
import type {RecipeModelType} from '../../../../../types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipe = (await Recipe.findOne({ short_name: params.name}).lean()) as RecipeModelType[];

  recipe = JSON.parse(JSON.stringify(recipe));
  if(recipe == null){
	throw error(404, "Recipe not found")
  }
  return json(recipe);
};
