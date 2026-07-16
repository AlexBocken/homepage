import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { WorkoutSession } from '$models/WorkoutSession';
import { verifyRunMapToken } from '$lib/server/runMapShare';
import { buildRunCard } from '$lib/server/runCardData';
import { extractId, sharedRunParam } from '$lib/fitness/prettyUrl';
import type { PageServerLoad } from './$types';

/**
 * Public, token-gated view of a shared run. No login required: access is
 * granted solely by a valid per-run share token (`?token=`), so social
 * crawlers and recipients can see the run and its OG card without an account.
 */
export const load: PageServerLoad = async ({ params, url }) => {
	const token = url.searchParams.get('token');

	// The param is `<slug>-<id>` (see $lib/fitness/prettyUrl); only the trailing id
	// is real. The token is signed over the id, so it must be verified against the
	// extracted id and never the decorated param — otherwise every existing share
	// link would break the moment a slug appeared.
	const id = extractId(params.id);

	// 404 (not 403) on a bad/missing token so we don't confirm the run exists.
	if (!mongoose.Types.ObjectId.isValid(id) || !verifyRunMapToken(id, token)) {
		throw error(404, 'Not found');
	}

	await dbConnect();
	// `createdBy` is selected deliberately: a shared run names its owner in the URL
	// and title. Everything else stays limited to what the share intends to show.
	const session = await WorkoutSession.findById(id)
		.select('name startTime duration totalVolume totalDistance kcalEstimate notes exercises createdBy')
		.lean();
	if (!session) throw error(404, 'Not found');

	const owner = session.createdBy?.trim() || undefined;

	// Heal the URL only once the token has been accepted, so the redirect can't be
	// used to probe which ids exist — a wrong token still 404s above, and a link
	// nobody can open never reveals a name.
	const canonical = sharedRunParam({ ...session, _id: id }, owner, 'en');
	if (canonical !== params.id) {
		redirect(308, `${resolve('/r/[id]', { id: canonical })}${url.search}`);
	}

	const card = buildRunCard(session);
	const cardImage = `${url.origin}/api/fitness/sessions/${id}/card.webp?token=${token}`;

	return {
		// createdBy is stripped from the serialised session: the owner reaches the
		// page as `card.title` alone, so no other part of the payload can leak it.
		session: JSON.parse(JSON.stringify({ ...session, createdBy: undefined })),
		card: { ...card, title: owner ? `${owner}'s ${card.title}` : card.title },
		cardImage,
		shareUrl: url.href
	};
};
