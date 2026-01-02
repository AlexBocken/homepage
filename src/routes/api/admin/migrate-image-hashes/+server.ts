import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { generateImageHash, getHashedFilename } from '$utils/imageHash';
import path from 'path';
import fs from 'fs';
import { rename } from 'node:fs/promises';

export const POST = (async ({ locals, request }) => {
	// Only allow in production (check if IMAGE_DIR contains production path)
	const isProd = IMAGE_DIR.includes('/var/www/static');

	// Require confirmation token to prevent accidental runs
	const data = await request.json();
	const confirmToken = data?.confirm;
	const adminToken = data?.adminToken;

	if (!isProd) {
		throw error(403, 'This endpoint only runs in production (IMAGE_DIR must be /var/www/static)');
	}

	if (confirmToken !== 'MIGRATE_IMAGES') {
		throw error(400, 'Missing or invalid confirmation token. Send {"confirm": "MIGRATE_IMAGES"}');
	}

	// Check authentication: either valid session OR admin token from env
	const auth = await locals.auth();
	const isAdminToken = adminToken && env.ADMIN_SECRET_TOKEN && adminToken === env.ADMIN_SECRET_TOKEN;

	if (!auth && !isAdminToken) {
		throw error(401, 'Need to be logged in or provide valid admin token');
	}

	await dbConnect();

	const results = {
		total: 0,
		migrated: 0,
		skipped: 0,
		errors: [] as string[],
		details: [] as any[]
	};

	try {
		// Get all recipes
		const recipes = await Recipe.find({});
		results.total = recipes.length;

		for (const recipe of recipes) {
			const shortName = recipe.short_name;

			try {
				// Check if already has hashed filename
				const currentMediaPath = recipe.images?.[0]?.mediapath;

				// If mediapath exists and has hash pattern, skip
				if (currentMediaPath && /\.[a-f0-9]{8}\.webp$/.test(currentMediaPath)) {
					results.skipped++;
					results.details.push({
						shortName,
						status: 'skipped',
						reason: 'already hashed',
						filename: currentMediaPath
					});
					continue;
				}

				// Check if image file exists on disk (try full size first)
				const unhashed_filename = `${shortName}.webp`;
				const fullPath = path.join(IMAGE_DIR, 'rezepte', 'full', unhashed_filename);

				if (!fs.existsSync(fullPath)) {
					results.skipped++;
					results.details.push({
						shortName,
						status: 'skipped',
						reason: 'file not found',
						path: fullPath
					});
					continue;
				}

				// Generate hash from the full-size image
				const imageHash = generateImageHash(fullPath);
				const hashedFilename = getHashedFilename(shortName, imageHash);

				// Create hashed versions and keep unhashed copies (for graceful degradation)
				const folders = ['full', 'thumb', 'placeholder'];
				let copiedCount = 0;

				for (const folder of folders) {
					const unhashedPath = path.join(IMAGE_DIR, 'rezepte', folder, unhashed_filename);
					const hashedPath = path.join(IMAGE_DIR, 'rezepte', folder, hashedFilename);

					if (fs.existsSync(unhashedPath)) {
						// Copy to hashed filename (keep original unhashed file)
						fs.copyFileSync(unhashedPath, hashedPath);
						copiedCount++;
					}
				}

				// Update database with hashed filename
				if (!recipe.images || recipe.images.length === 0) {
					// Create images array if it doesn't exist
					recipe.images = [{
						mediapath: hashedFilename,
						alt: recipe.name || '',
						caption: ''
					}];
				} else {
					// Update existing mediapath
					recipe.images[0].mediapath = hashedFilename;
				}

				await recipe.save();

				results.migrated++;
				results.details.push({
					shortName,
					status: 'migrated',
					unhashedFilename: unhashed_filename,
					hashedFilename: hashedFilename,
					hash: imageHash,
					filesCopied: copiedCount,
					note: 'Both hashed and unhashed versions saved for graceful degradation'
				});

			} catch (err) {
				results.errors.push(`${shortName}: ${err instanceof Error ? err.message : String(err)}`);
				results.details.push({
					shortName,
					status: 'error',
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}

		return new Response(JSON.stringify({
			success: true,
			message: `Migration complete. Migrated ${results.migrated} of ${results.total} recipes.`,
			...results
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});

	} catch (err) {
		throw error(500, `Migration failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}) satisfies RequestHandler;
