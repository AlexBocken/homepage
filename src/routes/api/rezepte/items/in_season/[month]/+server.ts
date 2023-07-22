import type {rand_array} from '$lib/js/randomize';
import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../../models/Recipe'
import { dbConnect, dbDisconnect } from '../../../../../../utils/db';
import { rand_array } from '$lib/js/randomize';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let found_in_season = rand_array(await Recipe.find({season: params.month}, 'name short_name images tags category icon description season').lean());
  await dbDisconnect();
  found_in_season = JSON.parse(JSON.stringify(found_in_season));
  return json(found_in_season);
};
