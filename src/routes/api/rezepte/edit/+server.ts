import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect } from '../../../../utils/db';
import type {RecipeModelType} from '../../../../types/types';
import { error } from '@sveltejs/kit';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, locals}) => {
  let message = await request.json()
  const recipe_json = message.recipe
  const auth = await locals.auth();
  if(!auth){
	  throw error(403, "Not logged in")
  }
  else{
	await dbConnect();
	await Recipe.findOneAndUpdate({short_name: message.old_short_name }, recipe_json);
	return new Response(JSON.stringify({msg: "Edited recipe successfully"}),{
			    status: 200,
  	});

  }
};
