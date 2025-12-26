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

    // Get recipes that are favorited AND have English translations
    let recipes = await Recipe.find({
      _id: { $in: userFavorites.favorites },
      'translations.en': { $exists: true }
    }).lean();

    // Transform to English format
    const englishRecipes = recipes.map(recipe => ({
      _id: recipe._id,
      short_name: recipe.translations.en.short_name,
      name: recipe.translations.en.name,
      category: recipe.translations.en.category,
      icon: recipe.icon,
      dateCreated: recipe.dateCreated,
      dateModified: recipe.dateModified,
      images: recipe.images?.map((img, idx) => ({
        mediapath: img.mediapath,
        alt: recipe.translations.en.images?.[idx]?.alt || img.alt,
        caption: recipe.translations.en.images?.[idx]?.caption || img.caption,
      })),
      description: recipe.translations.en.description,
      note: recipe.translations.en.note,
      tags: recipe.translations.en.tags || [],
      season: recipe.season,
      baking: recipe.baking,
      preparation: recipe.preparation,
      fermentation: recipe.fermentation,
      portions: recipe.portions,
      cooking: recipe.cooking,
      total_time: recipe.total_time,
      ingredients: recipe.translations.en.ingredients || [],
      instructions: recipe.translations.en.instructions || [],
      preamble: recipe.translations.en.preamble,
      addendum: recipe.translations.en.addendum,
      germanShortName: recipe.short_name,
      translationStatus: recipe.translations.en.translationStatus
    }));

    const result = JSON.parse(JSON.stringify(englishRecipes));

    return json(result);
  } catch (e) {
    throw error(500, 'Failed to fetch favorite recipes');
  }
};
