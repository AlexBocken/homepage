import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type {RecipeModelType} from '$types/types';
import { error } from '@sveltejs/kit';
import { rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { invalidateRecipeCaches } from '$lib/server/cache';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, locals}) => {
  let message = await request.json()
  const recipe_json = message.recipe
  const auth = await locals.auth();
  if(!auth){
	  throw error(403, "Not logged in")
  }
  else{
	await dbConnect();

	// Check if short_name has changed
	const oldShortName = message.old_short_name;
	const newShortName = recipe_json.short_name;

	if (oldShortName !== newShortName) {
		// Rename image files in all three directories
		const imageDirectories = ['full', 'thumb', 'placeholder'];
		const staticPath = join(process.cwd(), 'static', 'rezepte');

		for (const dir of imageDirectories) {
			const oldPath = join(staticPath, dir, `${oldShortName}.webp`);
			const newPath = join(staticPath, dir, `${newShortName}.webp`);

			// Only rename if the old file exists
			if (existsSync(oldPath)) {
				try {
					await rename(oldPath, newPath);
					console.log(`Renamed ${dir}/${oldShortName}.webp -> ${dir}/${newShortName}.webp`);
				} catch (err) {
					console.error(`Failed to rename ${dir}/${oldShortName}.webp:`, err);
					// Continue with other files even if one fails
				}
			}
		}
	}

	await Recipe.findOneAndUpdate({short_name: message.old_short_name }, recipe_json);

	// Invalidate recipe caches after successful update
	await invalidateRecipeCaches();

	return new Response(JSON.stringify({msg: "Edited recipe successfully"}),{
			    status: 200,
  	});

  }
};
