import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import type {RecipeModelType} from '../../../../types/types';
import { error } from '@sveltejs/kit';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, locals}) => {
  	let message = await request.json()

	const auth = await locals.auth();
  	if(!auth) throw error(401, "Need to be logged in")

  	const short_name = message.old_short_name
	await dbConnect();
	await Recipe.findOneAndDelete({short_name: short_name});
  	await dbDisconnect();
	return new Response(JSON.stringify({msg: "Deleted recipe successfully"}),{
			    status: 200,
  	});
}
