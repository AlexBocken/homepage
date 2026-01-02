import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();

  // Get distinct categories from approved English translations
  const categories = await Recipe.distinct('translations.en.category', {
    'translations.en.translationStatus': 'approved'
  }).lean();

  return json(JSON.parse(JSON.stringify(categories)));
};
