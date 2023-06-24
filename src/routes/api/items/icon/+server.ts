import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import type {BriefRecipeType} from '../../../../types/types';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let icons = (await Recipe.distinct('icon').lean());
  await dbDisconnect();

  icons = JSON.parse(JSON.stringify(icons));
  return json(icons);
};
