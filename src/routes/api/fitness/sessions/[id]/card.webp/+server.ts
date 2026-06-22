import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { promises as fs } from 'node:fs';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { ensureRunCardImage, ensureBackdropCardImage, runMapPath, extractRunTrack } from '$lib/server/runMapImage';
import { buildRunCard, buildStrengthCard, buildCardioCard } from '$lib/server/runCardData';
import { verifyRunMapToken } from '$lib/server/runMapShare';
import type { RequestHandler } from './$types';

/**
 * Share card for a GPS-tracked workout: the route map with a stats band,
 * sized 1200×630 for OG/social unfurls. Generated lazily on first request and
 * cached under `$IMAGE_DIR/fitness/`. Same access model + serving as map.webp
 * (owner session OR per-run share token); both live in the `/protected-fitness/`
 * nginx internal location.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!mongoose.Types.ObjectId.isValid(params.id)) {
		throw error(400, 'Invalid session ID');
	}

	await dbConnect();

	const token = url.searchParams.get('token');
	let authorized = verifyRunMapToken(params.id, token);
	if (!authorized) {
		const auth = locals.session ?? (await locals.auth());
		if (auth?.user?.nickname) {
			authorized = !!(await WorkoutSession.exists({
				_id: params.id,
				createdBy: auth.user.nickname
			}));
		}
	}
	if (!authorized) throw error(403, 'Forbidden');

	const session = await WorkoutSession.findById(params.id)
		.select('name startTime totalDistance totalVolume duration kcalEstimate prs gpsTrack gpsPreview exercises')
		.lean();
	if (!session) throw error(404, 'Session not found');

	// GPS run → map card. GPS-less run/ride (has distance) → footprints card.
	// Otherwise (weightlifting) → dumbbell card.
	let filename: string | null;
	if (extractRunTrack(session)) {
		filename = await ensureRunCardImage(params.id, session, buildRunCard(session));
	} else if ((session.totalDistance ?? 0) > 0) {
		filename = await ensureBackdropCardImage(params.id, buildCardioCard(session), 'run');
	} else {
		filename = await ensureBackdropCardImage(params.id, buildStrengthCard(session), 'dumbbell');
	}
	if (!filename) throw error(404, 'No card available');

	const cacheControl = 'public, max-age=86400';

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
