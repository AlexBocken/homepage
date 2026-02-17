import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';
import type { RecipeModelType } from '$types/types';
import { isEnglish } from '$lib/server/recipeHelpers';

/** Recursively map populated baseRecipeRef to resolvedRecipe field */
function mapBaseRecipeRefs(items: any[]): any[] {
  return items.map((item: any) => {
    if (item.type === 'reference' && item.baseRecipeRef) {
      const resolvedRecipe = { ...item.baseRecipeRef };
      if (resolvedRecipe.ingredients) {
        resolvedRecipe.ingredients = mapBaseRecipeRefs(resolvedRecipe.ingredients);
      }
      if (resolvedRecipe.instructions) {
        resolvedRecipe.instructions = mapBaseRecipeRefs(resolvedRecipe.instructions);
      }
      return { ...item, resolvedRecipe };
    }
    return item;
  });
}

export const GET: RequestHandler = async ({ params }) => {
  await dbConnect();
  const en = isEnglish(params.recipeLang);

  const query = en
    ? { 'translations.en.short_name': params.name }
    : { short_name: params.name };

  const populatePaths = en
    ? [
        {
          path: 'translations.en.ingredients.baseRecipeRef',
          select: 'short_name name ingredients instructions translations',
          populate: {
            path: 'ingredients.baseRecipeRef',
            select: 'short_name name ingredients instructions translations',
            populate: {
              path: 'ingredients.baseRecipeRef',
              select: 'short_name name ingredients instructions translations'
            }
          }
        },
        {
          path: 'translations.en.instructions.baseRecipeRef',
          select: 'short_name name ingredients instructions translations',
          populate: {
            path: 'instructions.baseRecipeRef',
            select: 'short_name name ingredients instructions translations',
            populate: {
              path: 'instructions.baseRecipeRef',
              select: 'short_name name ingredients instructions translations'
            }
          }
        }
      ]
    : [
        {
          path: 'ingredients.baseRecipeRef',
          select: 'short_name name ingredients translations',
          populate: {
            path: 'ingredients.baseRecipeRef',
            select: 'short_name name ingredients translations',
            populate: {
              path: 'ingredients.baseRecipeRef',
              select: 'short_name name ingredients translations'
            }
          }
        },
        {
          path: 'instructions.baseRecipeRef',
          select: 'short_name name instructions translations',
          populate: {
            path: 'instructions.baseRecipeRef',
            select: 'short_name name instructions translations',
            populate: {
              path: 'instructions.baseRecipeRef',
              select: 'short_name name instructions translations'
            }
          }
        }
      ];

  let dbQuery = Recipe.findOne(query);
  for (const p of populatePaths) {
    dbQuery = dbQuery.populate(p);
  }
  const rawRecipe = await dbQuery.lean();

  if (!rawRecipe) {
    throw error(404, 'Recipe not found');
  }

  if (en) {
    if (!rawRecipe.translations?.en) {
      throw error(404, 'English translation not available for this recipe');
    }

    const t = rawRecipe.translations.en;
    let recipe: any = {
      _id: rawRecipe._id,
      short_name: t.short_name,
      name: t.name,
      description: t.description,
      preamble: t.preamble || '',
      addendum: t.addendum || '',
      note: t.note || '',
      category: t.category,
      tags: t.tags || [],
      ingredients: t.ingredients || [],
      instructions: t.instructions || [],
      images: rawRecipe.images || [],
      icon: rawRecipe.icon || '',
      dateCreated: rawRecipe.dateCreated,
      dateModified: rawRecipe.dateModified,
      season: rawRecipe.season || [],
      baking: t.baking || rawRecipe.baking || { temperature: '', length: '', mode: '' },
      preparation: t.preparation || rawRecipe.preparation || '',
      fermentation: t.fermentation || rawRecipe.fermentation || { bulk: '', final: '' },
      portions: t.portions || rawRecipe.portions || '',
      cooking: t.cooking || rawRecipe.cooking || '',
      total_time: t.total_time || rawRecipe.total_time || '',
      translationStatus: t.translationStatus,
      germanShortName: rawRecipe.short_name,
    };

    if (recipe.ingredients) {
      recipe.ingredients = mapBaseRecipeRefs(recipe.ingredients);
    }
    if (recipe.instructions) {
      recipe.instructions = mapBaseRecipeRefs(recipe.instructions);
    }

    // Merge English alt/caption with original image paths
    const imagesArray = Array.isArray(rawRecipe.images) ? rawRecipe.images : (rawRecipe.images ? [rawRecipe.images] : []);
    if (imagesArray.length > 0) {
      const translatedImages = t.images || [];
      recipe.images = imagesArray.map((img: any, index: number) => ({
        mediapath: img.mediapath,
        alt: translatedImages[index]?.alt || img.alt || '',
        caption: translatedImages[index]?.caption || img.caption || '',
        color: img.color || '',
      }));
    }

    return json(recipe);
  }

  // German: pass through with base recipe ref mapping
  let recipe = JSON.parse(JSON.stringify(rawRecipe));
  if (recipe.ingredients) {
    recipe.ingredients = mapBaseRecipeRefs(recipe.ingredients);
  }
  if (recipe.instructions) {
    recipe.instructions = mapBaseRecipeRefs(recipe.instructions);
  }
  return json(recipe);
};
