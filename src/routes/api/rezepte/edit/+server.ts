import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import type {RecipeModelType} from '../../../../types/types';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies}) => {
  let message = await request.json()
  const recipe_json = message.recipe
  const user = await authenticateUser(cookies)
  console.log(user)
  if(!user){
	  throw error(403, "Not logged in")
  }
  else if(!user.access.includes("rezepte")){
	throw error(403, "This user does not have edit permissions for recipes")
  }
  else{
	await dbConnect();
	await Recipe.findOneAndUpdate({short_name: message.old_short_name }, recipe_json);
  	await dbDisconnect();
	return new Response(JSON.stringify({msg: "Edited recipe successfully"}),{
			    status: 200,
  	});

  }
};
