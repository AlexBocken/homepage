import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';
import type {RecipeModelType} from '../../../../../types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  let recipe = await Recipe.findOne({ short_name: params.name})
    .populate({
      path: 'ingredients.baseRecipeRef',
      select: 'short_name name ingredients translations'
    })
    .populate({
      path: 'instructions.baseRecipeRef',
      select: 'short_name name instructions translations'
    })
    .lean() as RecipeModelType[];

  recipe = JSON.parse(JSON.stringify(recipe));
  if(recipe == null){
	throw error(404, "Recipe not found")
  }

  // Map populated refs to resolvedRecipe field
  if (recipe?.ingredients) {
    recipe.ingredients = recipe.ingredients.map((item: any) => {
      if (item.type === 'reference' && item.baseRecipeRef) {
        return { ...item, resolvedRecipe: item.baseRecipeRef };
      }
      return item;
    });
  }

  if (recipe?.instructions) {
    recipe.instructions = recipe.instructions.map((item: any) => {
      if (item.type === 'reference' && item.baseRecipeRef) {
        return { ...item, resolvedRecipe: item.baseRecipeRef };
      }
      return item;
    });
  }

  return json(recipe);
};
