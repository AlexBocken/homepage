import { json, type RequestHandler } from '@sveltejs/kit';
import { UserFavorites } from '$models/UserFavorites';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type { RecipeModelType } from '$types/types';
import { error } from '@sveltejs/kit';
import { isEnglish, briefQueryConfig } from '$lib/server/recipeHelpers';

export const GET: RequestHandler = async ({ params, locals }) => {
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

    const { approvalFilter } = briefQueryConfig(params.recipeLang!);
    const en = isEnglish(params.recipeLang!);

    let recipes = await Recipe.find({
      _id: { $in: userFavorites.favorites } as any,
      ...approvalFilter
    }).lean() as unknown as RecipeModelType[];

    if (en) {
      const englishRecipes = recipes.map(recipe => {
        const t = recipe.translations?.en;
        return {
        _id: recipe._id,
        short_name: t?.short_name,
        name: t?.name,
        category: t?.category,
        icon: recipe.icon,
        dateCreated: recipe.dateCreated,
        dateModified: recipe.dateModified,
        images: recipe.images?.map((img, idx) => ({
          mediapath: img.mediapath,
          alt: t?.images?.[idx]?.alt || img.alt,
          caption: t?.images?.[idx]?.caption || img.caption,
        })),
        description: t?.description,
        note: t?.note,
        tags: t?.tags || [],
        season: recipe.season,
        baking: recipe.baking,
        preparation: recipe.preparation,
        fermentation: recipe.fermentation,
        portions: recipe.portions,
        cooking: recipe.cooking,
        total_time: recipe.total_time,
        ingredients: t?.ingredients || [],
        instructions: t?.instructions || [],
        preamble: t?.preamble,
        addendum: t?.addendum,
        germanShortName: recipe.short_name,
        translationStatus: t?.translationStatus
      }});
      return json(englishRecipes);
    }

    return json(recipes);
  } catch (e) {
    throw error(500, 'Failed to fetch favorite recipes');
  }
};
