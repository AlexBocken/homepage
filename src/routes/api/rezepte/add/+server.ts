import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect } from '../../../../utils/db';
import { error } from '@sveltejs/kit';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies, locals}) => {
	let message = await request.json()
  	const recipe_json = message.recipe
  	let auth =  await locals.auth();
	/*const user = session.user;*/
	console.log(auth)
  	if(!auth){
  		throw error(401, "Not logged in")
  	}
  	/*if(!user.access.includes("rezepte")){
  	      	throw error(401, "This user does not have permissions to add recipes")
  	}*/
	await dbConnect();
	try{
      		await Recipe.create(recipe_json);
	} catch(e){
      		throw error(400, e)
      	}
      	return new Response(JSON.stringify({msg: "Added recipe successfully"}),{
      		    status: 200,
	});
};
