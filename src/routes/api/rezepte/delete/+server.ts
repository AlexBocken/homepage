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

  	const user = await authenticateUser(cookies)
  	if(!user) throw error(401, "Need to be logged in")
  	if(!user.access.includes("rezepte")) throw error(401, "Insufficient permissions")

  	const short_name = message.old_short_name
	await dbConnect();
	await Recipe.findOneAndDelete({short_name: short_name});
  	await dbDisconnect();
	return new Response(JSON.stringify({msg: "Deleted recipe successfully"}),{
			    status: 200,
  	});
}
