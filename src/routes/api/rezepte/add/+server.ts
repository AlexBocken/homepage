import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';;
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies}) => {
	let message = await request.json()
  	const recipe_json = message.recipe
  	const user = await authenticateUser(cookies)
  	if(!user){
  		throw error(401, "Not logged in")
  	}
  	if(!user.access.includes("rezepte")){
  	      	throw error(401, "This user does not have permissions to add recipes")
  	}
  	else{
		await dbConnect();
  		try{
  	      		await Recipe.create(recipe_json);
  		} catch(e){
  	      		throw error(400, e)
  	      	}
  		await dbDisconnect();
  	      	return new Response(JSON.stringify({msg: "Added recipe successfully"}),{
  	      		    status: 200,
  		});
  	}
};
