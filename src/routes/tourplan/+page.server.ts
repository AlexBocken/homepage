import type { PageServerLoad } from './$types';
import { TourplanDelay } from '$models/TourplanDelay';
import { dbConnect } from '$utils/db';

const TOUR_KEY = '2026';

export const load: PageServerLoad = async ({ locals }) => {
	const auth = locals.session ?? (await locals.auth());
	const loggedIn = !!auth?.user?.nickname;

	let delay = null;
	try {
		await dbConnect();
		const doc = await TourplanDelay.findOne({ tour: TOUR_KEY }).lean();
		if (doc) {
			delay = {
				minutes: doc.delayMinutes,
				stationKey: doc.stationKey ?? null,
				loggedBy: doc.loggedBy ?? null,
				loggedAt: doc.loggedAt ?? null
			};
		}
	} catch (e) {
		// The plan must still render if Mongo is unreachable — just no live delay.
		console.error('tourplan: failed to read delay', e);
	}

	// Seeds the page's clock so the server and client first render agree.
	return { loggedIn, delay, serverNow: Date.now() };
};
