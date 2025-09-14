import { json, type RequestHandler } from '@sveltejs/kit';
import { UserFavorites } from '../../../../../models/UserFavorites';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';
import type { RecipeModelType } from '../../../../../types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  
  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }
  
  await dbConnect();
  
  try {
    const userFavorites = await UserFavorites.findOne({ 
      username: session.user.nickname 
    }).lean();
    
    if (!userFavorites?.favorites?.length) {
      return json([]);
    }
    
    let recipes = await Recipe.find({ 
      _id: { $in: userFavorites.favorites }
    }).lean() as RecipeModelType[];
    
    
    recipes = JSON.parse(JSON.stringify(recipes));
    
    return json(recipes);
  } catch (e) {
    throw error(500, 'Failed to fetch favorite recipes');
  }
};