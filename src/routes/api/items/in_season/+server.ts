import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe'
import { dbConnect, dbDisconnect } from '../../../../utils/db';

export const GET: RequestHandler = async ({params}) => {
  let current_month = 6;
  await dbConnect();
  let found_in_season = (await Recipe.find({season: current_month}, 'name short_name images tags category icon description season').lean());
  await dbDisconnect();
  found_in_season = JSON.parse(JSON.stringify(found_in_season));
  return json(found_in_season);
};
