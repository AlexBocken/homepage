import { unlink } from 'fs/promises';
import path from 'path';
import { IMAGE_DIR } from '$env/static/private';

const RECIPE_IMAGE_DIR = path.join(IMAGE_DIR, 'rezepte');

/**
 * Delete a recipe image's files (full size and thumbnail). Removes the given
 * file and, when it is a hashed name (`name.1a2b3c4d.webp`), its unhashed
 * `name.webp` too, which older recipes still use. Missing files are only
 * logged: the database is what decides whether a recipe exists.
 */
export async function deleteRecipeImage(filename: string): Promise<void> {
	if (!filename) return;

	const unhashedFilename =
		filename
			.replace(/\.[a-f0-9]{8}\.webp$/, '') // Remove hash if present
			.replace(/\.webp$/, '') + '.webp';

	for (const dir of ['full', 'thumb']) {
		for (const name of new Set([filename, unhashedFilename])) {
			const file = path.resolve(RECIPE_IMAGE_DIR, dir, name);
			// A stored name must not reach outside the image folder.
			if (!file.startsWith(path.resolve(RECIPE_IMAGE_DIR, dir) + path.sep)) {
				console.warn(`Refusing to delete ${file}: outside ${dir}/`);
				continue;
			}
			try {
				await unlink(file);
				console.log(`Deleted image: ${dir}/${name}`);
			} catch (err) {
				console.warn(`Could not delete image ${dir}/${name}:`, err);
			}
		}
	}
}
