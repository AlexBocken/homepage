import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe'
import { dbConnect, dbDisconnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({params}) => {
  let current_month = 6;
  await dbConnect();
  let found_brief = (await Recipe.find({}, 'name short_name images tags category icon description season').lean());
  await dbDisconnect();
  console.log(found_brief)
  let recipes = JSON.parse(JSON.stringify(found_brief));
  return json(recipes);
};
