import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../utils/db';
import type {RecipeModelType} from '../../../types/types';
import { BEARER_TOKEN } from '$env/static/private'
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
  let message = await request.json()
  const short_name = message.old_short_name
  const bearer_token = message.headers.bearer
  if(bearer_token === BEARER_TOKEN){
	console.log("PASSWORD CORRECT")
  	await dbConnect();
	await Recipe.findOneAndDelete({short_name: short_name});
  	await dbDisconnect();
	return {status: 400} //TODO: cleanup error throwing
  }
  else{
	console.log("PASSWORD INCORRECT")
	  return {status: 403}
  }
};
