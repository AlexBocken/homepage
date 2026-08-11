import { json, type RequestHandler } from '@sveltejs/kit';
import { UserFavorites } from '$models/UserFavorites';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type { RecipeModelType } from '$types/types';
import { error } from '@sveltejs/kit';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

/**
 * The favourites listing browses with the same filter rail as every other one,
 * so it needs the same brief shape: season ranges and the macro facet the
 * nutrition sliders read, and none of the ingredients and instructions a card
 * never shows.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = locals.session ?? await locals.auth();

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

    const { approvalFilter, projection } = briefQueryConfig(params.recipeLang!);

    const recipes = await Recipe.find({
      _id: { $in: userFavorites.favorites } as any,
      ...approvalFilter
    }, projection).lean() as unknown as RecipeModelType[];

    return json(recipes.map((recipe) => toBrief(recipe, params.recipeLang!)));
  } catch (e) {
    throw error(500, 'Failed to fetch favorite recipes');
  }
};
