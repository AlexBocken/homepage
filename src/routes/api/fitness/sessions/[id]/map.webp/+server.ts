import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { promises as fs } from 'node:fs';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { ensureRunMapImage, runMapPath } from '$lib/server/runMapImage';
import { verifyRunMapToken } from '$lib/server/runMapShare';
import type { RequestHandler } from './$types';

/**
 * Serves the static route-map image for a GPS-tracked workout, generating it
 * lazily on first request and caching it under `$IMAGE_DIR/fitness/`.
 *
 * Access is per-user: either the requester owns the session (session cookie)
 * or presents a valid per-session share token (`?token=`, for OG/share use
 * where no cookie is sent).
 *
 * Production: returns `X-Accel-Redirect` so nginx serves the bytes from an
 * `internal` location; Node never streams the file. Add once to nginx:
 *
 *   location /protected-fitness/ {
 *       internal;
 *       alias /var/www/static/images/fitness/;   # = $IMAGE_DIR/fitness/
 *   }
 *
 * Dev (`vite dev`): no nginx, so stream the file directly. Auth is identical.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		throw error(400, 'Invalid session ID');
	}

	await dbConnect();

	// Authorize: owner session, or a valid share token for this exact session.
	const token = url.searchParams.get('token');
	let authorized = verifyRunMapToken(params.id, token);
	if (!authorized) {
		const auth = locals.session ?? (await locals.auth());
		authorized = !!auth?.user?.nickname;
		if (authorized) {
			// Confirm ownership rather than just "logged in".
			const owned = await WorkoutSession.exists({
				_id: params.id,
				createdBy: auth!.user!.nickname
			});
			authorized = !!owned;
		}
	}
	if (!authorized) throw error(403, 'Forbidden');

	// We need the track to render. Fetch only the GPS fields.
	const session = await WorkoutSession.findById(params.id)
		.select('gpsTrack gpsPreview exercises.gpsTrack exercises.gpsPreview')
		.lean();
	if (!session) throw error(404, 'Session not found');

	const filename = await ensureRunMapImage(params.id, session);
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
