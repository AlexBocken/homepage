import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { generateRecipeJsonLd } from '$lib/js/recipeJsonLd';
import { resolveReferencedNutrition } from '$lib/server/nutritionMatcher';
import type { RecipeModelType } from '$types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  await dbConnect();
  let recipe = (await Recipe.findOne({ short_name: params.name })
    .populate({ path: 'ingredients.baseRecipeRef', select: 'short_name name ingredients nutritionMappings' })
    .lean()) as unknown as RecipeModelType;

  recipe = JSON.parse(JSON.stringify(recipe));
  if (recipe == null) {
    throw error(404, "Recipe not found");
  }

  const referencedNutrition = await resolveReferencedNutrition(recipe.ingredients || [], recipe.nutritionMappings);
  const lang = params.recipeLang === 'recipes' ? 'en' : 'de';
  const jsonLd = generateRecipeJsonLd(recipe, referencedNutrition, lang);

  // Set appropriate headers for JSON-LD
  setHeaders({
    'Content-Type': 'application/ld+json',
    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
  });

  return new Response(JSON.stringify(jsonLd, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};