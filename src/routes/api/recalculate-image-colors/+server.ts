import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Recipe } from '$models/Recipe.js';
import { IMAGE_DIR } from '$env/static/private';
import { extractDominantColor } from '$utils/imageProcessing';
import { join } from 'path';
import { access, constants } from 'fs/promises';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { filter = 'missing', limit = 50 } = body;

		let query: any = { images: { $exists: true, $ne: [] } };

		if (filter === 'missing') {
			query = {
				images: {
					$elemMatch: {
						mediapath: { $exists: true },
						$or: [{ color: { $exists: false } }, { color: '' }],
					},
				},
			};
		}

		const recipes = await Recipe.find(query).limit(limit);

		if (recipes.length === 0) {
			return json({
				success: true,
				processed: 0,
				message: 'No recipes found matching criteria',
			});
		}

		const results: Array<{
			shortName: string;
			name: string;
			color: string;
			status: 'ok' | 'error';
			error?: string;
		}> = [];

		for (const recipe of recipes) {
			const image = recipe.images[0];
			if (!image?.mediapath) continue;

			// Try unhashed filename first (always exists), fall back to hashed
			const basename = image.mediapath
				.replace(/\.[a-f0-9]{8}\.webp$/, '')
				.replace(/\.webp$/, '');
			const unhashedFilename = basename + '.webp';

			const candidates = [
				join(IMAGE_DIR, 'rezepte', 'full', unhashedFilename),
				join(IMAGE_DIR, 'rezepte', 'full', image.mediapath),
				join(IMAGE_DIR, 'rezepte', 'thumb', unhashedFilename),
				join(IMAGE_DIR, 'rezepte', 'thumb', image.mediapath),
			];

			let imagePath: string | null = null;
			for (const candidate of candidates) {
				try {
					await access(candidate, constants.R_OK);
					imagePath = candidate;
					break;
				} catch {
					// try next
				}
			}

			if (!imagePath) {
				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					color: '',
					status: 'error',
					error: 'Image file not found on disk',
				});
				continue;
			}

			try {
				const color = await extractDominantColor(imagePath);
				recipe.images[0].color = color;
				await recipe.save();

				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					color,
					status: 'ok',
				});
			} catch (err) {
				console.error(`Failed to extract color for ${recipe.short_name}:`, err);
				results.push({
					shortName: recipe.short_name,
					name: recipe.name,
					color: '',
					status: 'error',
					error: err instanceof Error ? err.message : 'Unknown error',
				});
			}
		}

		return json({
			success: true,
			processed: results.filter(r => r.status === 'ok').length,
			failed: results.filter(r => r.status === 'error').length,
			results,
		});
	} catch (err) {
		console.error('Error in bulk color recalculation:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, err instanceof Error ? err.message : 'Failed to recalculate colors');
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const totalWithImages = await Recipe.countDocuments({
			images: { $exists: true, $ne: [] },
		});

		const missingColor = await Recipe.countDocuments({
			images: {
				$elemMatch: {
					mediapath: { $exists: true },
					$or: [{ color: { $exists: false } }, { color: '' }],
				},
			},
		});

		const withColor = totalWithImages - missingColor;

		return json({
			totalWithImages,
			missingColor,
			withColor,
		});
	} catch (err) {
		throw error(500, 'Failed to fetch statistics');
	}
};
