import { error } from '@sveltejs/kit';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { verifyRunMapToken } from '$lib/server/runMapShare';
import { buildRunCard } from '$lib/server/runCardData';
import type { PageServerLoad } from './$types';

/**
 * Public, token-gated view of a shared run. No login required: access is
 * granted solely by a valid per-run share token (`?token=`), so social
 * crawlers and recipients can see the run and its OG card without an account.
 */
export const load: PageServerLoad = async ({ params, url }) => {
	const token = url.searchParams.get('token');
	// 404 (not 403) on a bad/missing token so we don't confirm the run exists.
	if (!mongoose.Types.ObjectId.isValid(params.id) || !verifyRunMapToken(params.id, token)) {
		throw error(404, 'Not found');
	}

	await dbConnect();
	// Full view fields, but never the owner (createdBy) or anything that would
	// leak who recorded it beyond what the share intends.
	const session = await WorkoutSession.findById(params.id)
		.select('name startTime duration totalVolume totalDistance kcalEstimate notes exercises')
		.lean();
	if (!session) throw error(404, 'Not found');

	const card = buildRunCard(session);
	const cardImage = `${url.origin}/api/fitness/sessions/${params.id}/card.webp?token=${token}`;

	return {
		session: JSON.parse(JSON.stringify(session)),
		card,
		cardImage,
		shareUrl: url.href
	};
};
