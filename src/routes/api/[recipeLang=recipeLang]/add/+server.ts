import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';
import { requireGroup } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({request, locals}) => {
	await requireGroup(locals, 'rezepte_users');
	let message = await request.json()
  	const recipe_json = message.recipe
	await dbConnect();
	try{
      		await Recipe.create(recipe_json);
	} catch(e){
      		throw error(400, e instanceof Error ? e.message : String(e))
      	}
      	return new Response(JSON.stringify({msg: "Added recipe successfully"}),{
      		    status: 200,
	});
};
