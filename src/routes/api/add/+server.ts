import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../utils/db';
import type {RecipeModelType} from '../../../types/types';
import { BEARER_TOKEN } from '$env/static/private'
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
  let message = await request.json()
  const recipe_json = message.recipe
  const bearer_token = message.headers.bearer
  console.log("RECIPE:", recipe_json)
  console.log("BEARER:", bearer_token)
  if(bearer_token === BEARER_TOKEN){
  	await dbConnect();
	await Recipe.create(recipe_json);
  	await dbDisconnect();
	return {status: 400}
  }
  else{
	  return {status: 403}
  }
};
