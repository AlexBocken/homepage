import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();

  // Get all recipes with English translations
  const recipes = await Recipe.find({
    'translations.en': { $exists: true }
  }, 'translations.en.tags').lean();

  // Extract and flatten all unique tags
  const tagsSet = new Set<string>();
  recipes.forEach(recipe => {
    if (recipe.translations?.en?.tags) {
      recipe.translations.en.tags.forEach((tag: string) => tagsSet.add(tag));
    }
  });

  const tags = Array.from(tagsSet).sort();

  return json(JSON.parse(JSON.stringify(tags)));
};
