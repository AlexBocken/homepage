import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Recipe } from '$models/Recipe.js';
import { IMAGE_DIR } from '$env/static/private';
import { blurPlaceholder } from '$lib/server/lqip';
import { join } from 'path';
import { access, constants } from 'fs/promises';
import { requireAuth, requireGroup } from '$lib/server/middleware/auth';

/**
 * Backfill for `images[].blur`, driven by /rezepte/admin/image-blurs.
 *
 * Recipe images live on the server's disk (IMAGE_DIR), not in the repo, so
 * unlike the hikes placeholders these can't be built ahead of time — this
 * endpoint reads the stored file and writes the placeholder back to the recipe.
 * It runs in batches so a few hundred recipes can be worked through without a
 * single request that runs for minutes.
 */

/** Recipes whose first image has no placeholder yet. */
const MISSING_BLUR_QUERY = {
	images: {
		$elemMatch: {
			mediapath: { $exists: true },
			$or: [{ blur: { $exists: false } }, { blur: '' }]
		}
	}
};

/**
 * The stored file for an image, or null when nothing is on disk. The unhashed
 * name is tried first because it always exists; the hashed one is the
 * cache-busting copy.
 */
async function resolveImagePath(mediapath: string): Promise<string | null> {
	const basename = mediapath.replace(/\.[a-f0-9]{8}\.webp$/, '').replace(/\.webp$/, '');
	const unhashedFilename = basename + '.webp';
	const candidates = [
		join(IMAGE_DIR, 'rezepte', 'full', unhashedFilename),
		join(IMAGE_DIR, 'rezepte', 'full', mediapath),
		join(IMAGE_DIR, 'rezepte', 'thumb', unhashedFilename),
		join(IMAGE_DIR, 'rezepte', 'thumb', mediapath)
	];
	for (const candidate of candidates) {
		try {
			await access(candidate, constants.R_OK);
			return candidate;
		} catch {
			// try next
		}
	}
	return null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireGroup(locals, 'rezepte_users');

	try {
		const body = await request.json();
		const { filter = 'missing', limit = 50 } = body;

		const query: Record<string, unknown> =
			filter === 'missing' ? MISSING_BLUR_QUERY : { images: { $exists: true, $ne: [] } };

		const recipes = await Recipe.find(query).limit(limit);

		if (recipes.length === 0) {
			return json({
				success: true,
				processed: 0,
				message: 'No recipes found matching criteria'
			});
		}

		const results: Array<{
			shortName: string;
			name: string;
			blur: string;
			bytes: number;
			status: 'ok' | 'error';
			error?: string;
		}> = [];

		for (const recipe of recipes) {
			if (!recipe.images?.length) continue;
			const image = recipe.images[0];
			if (!image?.mediapath) continue;

			const imagePath = await resolveImagePath(image.mediapath);
			if (!imagePath) {
				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					blur: '',
					bytes: 0,
					status: 'error',
					error: 'Image file not found on disk'
				});
				continue;
			}

			try {
				const blur = await blurPlaceholder(imagePath);
				if (!blur) throw new Error('Placeholder could not be generated');
				// `$unset` clears the dominant-colour hex this replaced: it is no
				// longer in the schema, so a document save would leave it behind
				// in Mongo forever. The collection cleans itself as this runs.
				await Recipe.updateOne(
					{ _id: recipe._id },
					{ $set: { 'images.0.blur': blur }, $unset: { 'images.0.color': '' } }
				);

				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					blur,
					bytes: blur.length,
					status: 'ok'
				});
			} catch (err) {
				console.error(`Failed to build blur for ${recipe.short_name}:`, err);
				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					blur: '',
					bytes: 0,
					status: 'error',
					error: err instanceof Error ? err.message : 'Unknown error'
				});
			}
		}

		return json({
			success: true,
			processed: results.filter((r) => r.status === 'ok').length,
			failed: results.filter((r) => r.status === 'error').length,
			results
		});
	} catch (err) {
		console.error('Error in bulk blur generation:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, err instanceof Error ? err.message : 'Failed to generate blur placeholders');
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	await requireAuth(locals);

	try {
		const totalWithImages = await Recipe.countDocuments({
			images: { $exists: true, $ne: [] }
		});

		const missingBlur = await Recipe.countDocuments(MISSING_BLUR_QUERY);

		return json({
			totalWithImages,
			missingBlur,
			withBlur: totalWithImages - missingBlur
		});
	} catch {
		throw error(500, 'Failed to fetch statistics');
	}
};
