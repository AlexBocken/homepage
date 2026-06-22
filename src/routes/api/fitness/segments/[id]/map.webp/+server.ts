import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { promises as fs } from 'node:fs';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { Segment } from '$models/Segment';
import { ensureSegmentMapImage, runMapPath } from '$lib/server/runMapImage';
import type { RequestHandler } from './$types';

/**
 * Static route-map image for a segment, generated lazily on first request and
 * cached under `$IMAGE_DIR/fitness/seg-<id>.<hash>.webp`. Visible to any
 * logged-in user for a public segment, or to the creator for a private one.
 * Mirrors the run map.webp handler (nginx X-Accel-Redirect in prod, direct
 * stream in dev).
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		throw error(400, 'Invalid segment ID');
	}

	const auth = locals.session ?? (await locals.auth());
	if (!auth?.user?.nickname) throw error(403, 'Forbidden');

	await dbConnect();

	const segment = await Segment.findById(params.id).select('points public createdBy').lean();
	if (!segment) throw error(404, 'Segment not found');
	if (!segment.public && segment.createdBy !== auth.user.nickname) {
		throw error(403, 'Forbidden');
	}

	const filename = await ensureSegmentMapImage(params.id, segment.points);
	if (!filename) throw error(404, 'No route map available');

	const cacheControl = 'private, max-age=86400';

	if (dev) {
		try {
			const data = await fs.readFile(runMapPath(filename));
			return new Response(new Uint8Array(data), {
				status: 200,
				headers: { 'Content-Type': 'image/webp', 'Cache-Control': cacheControl }
			});
		} catch {
			throw error(404, 'No route map available');
		}
	}

	return new Response(null, {
		status: 200,
		headers: {
			'X-Accel-Redirect': `/protected-fitness/${filename}`,
			'Cache-Control': cacheControl
		}
	});
};
