import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type {RecipeModelType} from '$types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipe = await Recipe.findOne({ short_name: params.name})
    .populate({
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
    })
    .populate({
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
    })
    .lean() as RecipeModelType[];

  recipe = JSON.parse(JSON.stringify(recipe));
  if(recipe == null){
	throw error(404, "Recipe not found")
  }

  // Recursively map populated refs to resolvedRecipe field
  function mapBaseRecipeRefs(items: any[]): any[] {
    return items.map((item: any) => {
      if (item.type === 'reference' && item.baseRecipeRef) {
        const resolvedRecipe = { ...item.baseRecipeRef };

        // Recursively map nested baseRecipeRefs
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

  if (recipe?.ingredients) {
    recipe.ingredients = mapBaseRecipeRefs(recipe.ingredients);
  }

  if (recipe?.instructions) {
    recipe.instructions = mapBaseRecipeRefs(recipe.instructions);
  }

  return json(recipe);
};
