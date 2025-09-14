import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';
import { generateRecipeJsonLd } from '$lib/js/recipeJsonLd';
import type { RecipeModelType } from '../../../../../types/types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  await dbConnect();
  let recipe = (await Recipe.findOne({ short_name: params.name }).lean()) as RecipeModelType;

  recipe = JSON.parse(JSON.stringify(recipe));
  if (recipe == null) {
    throw error(404, "Recipe not found");
  }

  const jsonLd = generateRecipeJsonLd(recipe);

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