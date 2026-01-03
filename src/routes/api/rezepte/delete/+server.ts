import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../models/Recipe';
import { UserFavorites } from '../../../../models/UserFavorites';
import { dbConnect } from '../../../../utils/db';
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

	// Find the recipe to get its ObjectId before deleting
	const recipe = await Recipe.findOne({short_name: short_name});
	if (!recipe) {
		throw error(404, "Recipe not found");
	}

	// Remove this recipe from all users' favorites
	await UserFavorites.updateMany(
		{ favorites: recipe._id },
		{ $pull: { favorites: recipe._id } }
	);

	// Delete the recipe
	await Recipe.findOneAndDelete({short_name: short_name});

	return new Response(JSON.stringify({msg: "Deleted recipe successfully"}),{
		    status: 200,
  	});
}
