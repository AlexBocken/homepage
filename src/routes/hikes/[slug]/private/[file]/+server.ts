import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from './$types';

/**
 * Gates `/hikes/<slug>/private/<file>` image requests behind an authenticated
 * session.
 *
 * Production: returns `X-Accel-Redirect` so nginx serves the bytes from
 * `/var/www/static/hikes/<slug>/private/<file>` via its `internal` location
 * `/protected-hikes/`. Node never touches the file.
 *
 * Dev (`vite dev`): no nginx in front, so X-Accel-Redirect would yield an
 * empty 200. Read the file from the local `hikes-assets/` tree and stream
 * it back. Auth check is identical either way.
 */
const MIME: Record<string, string> = {
	'.avif': 'image/avif',
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png'
};

export const GET: RequestHandler = async ({ locals, params }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) {
		throw error(401, 'Authentication required.');
	}

	const { slug, file } = params;
	// SvelteKit's `[file]` matcher excludes `/`, but reject literal `..` to be
	// defensive if the route ever gets mounted under a different matcher.
	if (!slug || !file || file.includes('/') || file.includes('..') || slug.includes('..')) {
		throw error(400, 'Bad request.');
	}

	if (dev) {
		const filePath = path.join(process.cwd(), 'hikes-assets', slug, 'private', file);
		try {
			const data = await fs.readFile(filePath);
			const mime = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
			return new Response(new Uint8Array(data), {
				status: 200,
				headers: {
					'Content-Type': mime,
					'Cache-Control': 'private, max-age=60'
				}
			});
		} catch {
			throw error(404, 'Image not found.');
		}
	}

	return new Response(null, {
		status: 200,
		headers: {
			// nginx replaces the body with the file contents; the `Content-Type`
			// nginx sets at the `/protected-hikes/` location wins, so no point
			// guessing one here. Cache headers there govern downstream caching.
			'X-Accel-Redirect': `/protected-hikes/${slug}/private/${file}`,
			'Cache-Control': 'no-store'
		}
	});
};
