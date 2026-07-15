import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { TourplanDelay } from '$models/TourplanDelay';
import { dbConnect } from '$utils/db';

// Single tour for now; the model is keyed on this so a future year is a new doc.
const TOUR_KEY = '2026';

// Sanity bound: nobody is ±12h off the printed plan.
const MAX_ABS_MINUTES = 720;

type DelayPayload = {
	minutes: number;
	stationKey: string | null;
	loggedBy: string | null;
	loggedAt: number | null;
} | null;

async function readDelay(): Promise<DelayPayload> {
	await dbConnect();
	const doc = await TourplanDelay.findOne({ tour: TOUR_KEY }).lean();
	if (!doc) return null;
	return {
		minutes: doc.delayMinutes,
		stationKey: doc.stationKey ?? null,
		loggedBy: doc.loggedBy ?? null,
		loggedAt: doc.loggedAt ?? null
	};
}

export const GET: RequestHandler = async () => {
	return json({ delay: await readDelay() });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const auth = locals.session ?? (await locals.auth());
	const nickname = auth?.user?.nickname;
	if (!nickname) throw error(401, 'Not logged in');

	const body = await request.json().catch(() => null);
	const minutes = Math.round(Number(body?.delayMinutes));
	if (!Number.isFinite(minutes) || Math.abs(minutes) > MAX_ABS_MINUTES) {
		throw error(400, 'Invalid delayMinutes');
	}
	const stationKey = typeof body?.stationKey === 'string' ? body.stationKey.slice(0, 120) : null;

	await dbConnect();
	await TourplanDelay.findOneAndUpdate(
		{ tour: TOUR_KEY },
		{ delayMinutes: minutes, stationKey, loggedBy: nickname, loggedAt: Date.now() },
		{ upsert: true, new: true }
	);
	return json({ delay: await readDelay() });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	const auth = locals.session ?? (await locals.auth());
	if (!auth?.user?.nickname) throw error(401, 'Not logged in');

	await dbConnect();
	await TourplanDelay.deleteOne({ tour: TOUR_KEY });
	return json({ delay: null });
};
