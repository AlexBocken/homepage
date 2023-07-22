import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import type {BriefRecipeType} from '../../../../../types/types';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let categories = (await Recipe.distinct('category').lean());
  await dbDisconnect();

  categories= JSON.parse(JSON.stringify(categories));
  return json(categories);
};
