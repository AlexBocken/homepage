import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from './$types';

/**
 * Gates `/private-images/<file>` requests behind an authenticated session.
 * These are the encoded variants produced by scripts/build-private-images.ts
 * and referenced from <Image private> via src/lib/data/privateImages.generated.ts.
 *
 * Production: returns `X-Accel-Redirect` so nginx serves the bytes from
 * `/var/www/static/private-images/<file>` via an `internal` location. Node never
 * touches the file. Add this once to the server's nginx config:
 *
 *   location /protected-images/ {
 *       internal;
 *       alias /var/www/static/private-images/;
 *   }
 *
 * Dev (`vite dev`): no nginx in front, so stream the file from the local
 * `private-assets/` tree. The auth check is identical either way.
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

	const file = params.file;
	// `[...file]` may contain `/` for nested sources; reject `..` traversal.
	if (!file || file.includes('..')) {
		throw error(400, 'Bad request.');
	}

	if (dev) {
		const base = path.join(process.cwd(), 'private-assets');
		const filePath = path.join(base, file);
		// Defensive: ensure the resolved path stays inside private-assets/.
		if (filePath !== base && !filePath.startsWith(base + path.sep)) {
			throw error(400, 'Bad request.');
		}
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
			// nginx replaces the body with the file from the `internal` location;
			// the Content-Type it sets there wins, so we don't guess one here.
			'X-Accel-Redirect': `/protected-images/${file}`,
			'Cache-Control': 'no-store'
		}
	});
};
