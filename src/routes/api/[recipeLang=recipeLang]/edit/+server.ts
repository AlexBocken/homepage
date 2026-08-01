import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type {RecipeModelType} from '$types/types';
import { error } from '@sveltejs/kit';
import { rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireGroup } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({request, locals}) => {
  await requireGroup(locals, 'rezepte_users');
  let message = await request.json()
  const recipe_json = message.recipe

  await dbConnect();

  // Check if short_name has changed
  const oldShortName = message.old_short_name;
  const newShortName = recipe_json.short_name;

  if (oldShortName !== newShortName) {
    const imageDirectories = ['full', 'thumb'];
    const staticPath = join(process.cwd(), 'static', 'rezepte');

    for (const dir of imageDirectories) {
      const oldPath = join(staticPath, dir, `${oldShortName}.webp`);
      const newPath = join(staticPath, dir, `${newShortName}.webp`);

      if (existsSync(oldPath)) {
        try {
          await rename(oldPath, newPath);
        } catch (err) {
          console.error(`Failed to rename ${dir}/${oldShortName}.webp:`, err);
        }
      }
    }
  }

  // Ingredients or their mappings may have changed, which makes the stored
  // per-100 g figures a claim about a recipe that no longer exists. Unsetting
  // the field marks it "never calculated", and the listing endpoint refills it
  // on the next request.
  await Recipe.findOneAndUpdate(
    { short_name: message.old_short_name },
    { $set: recipe_json, $unset: { cachedPer100g: '', cachedTotalGrams: '' } }
  );

  return new Response(JSON.stringify({msg: "Edited recipe successfully"}),{
    status: 200,
  });
};
