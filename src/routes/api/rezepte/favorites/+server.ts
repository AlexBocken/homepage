import { json, type RequestHandler } from '@sveltejs/kit';
import { UserFavorites } from '$models/UserFavorites';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';
import mongoose from 'mongoose';

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
    
    
    return json({
      favorites: userFavorites?.favorites || []
    });
  } catch (e) {
    throw error(500, 'Failed to fetch favorites');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  
  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }
  
  const { recipeId } = await request.json();
  
  if (!recipeId) {
    throw error(400, 'Recipe ID required');
  }
  
  await dbConnect();
  
  try {
    // Validate that the recipe exists and get its ObjectId
    const recipe = await Recipe.findOne({ short_name: recipeId });
    if (!recipe) {
        throw error(404, 'Recipe not found');
    }
    
    await UserFavorites.findOneAndUpdate(
      { username: session.user.nickname },
      { $addToSet: { favorites: recipe._id } },
      { upsert: true, new: true }
    );
    
    
    return json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) {
      throw e;
    }
    throw error(500, 'Failed to add favorite');
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  
  if (!session?.user?.nickname) {
    throw error(401, 'Authentication required');
  }
  
  const { recipeId } = await request.json();
  
  if (!recipeId) {
    throw error(400, 'Recipe ID required');
  }
  
  await dbConnect();
  
  try {
    // Find the recipe's ObjectId
    const recipe = await Recipe.findOne({ short_name: recipeId });
    if (!recipe) {
        throw error(404, 'Recipe not found');
    }
    
    await UserFavorites.findOneAndUpdate(
      { username: session.user.nickname },
      { $pull: { favorites: recipe._id } }
    );
    
    
    return json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) {
      throw e;
    }
    throw error(500, 'Failed to remove favorite');
  }
};