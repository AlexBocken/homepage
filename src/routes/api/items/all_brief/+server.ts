import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType } from '../../../../types/types';
import { Recipe } from '../../../../models/Recipe'
import { dbConnect, dbDisconnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let found_brief = (await Recipe.find({}, 'name short_name images tags category icon description season').lean()) as BriefRecipeType[];
  await dbDisconnect();
  return json(JSON.parse(JSON.stringify(found_brief)));
};
