import { json, type RequestHandler } from '@sveltejs/kit';
import { UserFavorites } from '../../../../../../models/UserFavorites';
import { Recipe } from '../../../../../../models/Recipe';
import { dbConnect } from '../../../../../../utils/db';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  
  if (!session?.user?.nickname) {
    return json({ isFavorite: false });
  }
  
  await dbConnect();
  
  try {
    // Find the recipe by short_name to get its ObjectId
    const recipe = await Recipe.findOne({ short_name: params.shortName });
    if (!recipe) {
      throw error(404, 'Recipe not found');
    }
    
    // Check if this recipe is in the user's favorites
    const userFavorites = await UserFavorites.findOne({ 
      username: session.user.nickname,
      favorites: recipe._id
    }).lean();
    
    
    return json({
      isFavorite: !!userFavorites
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) {
      throw e;
    }
    throw error(500, 'Failed to check favorite status');
  }
};