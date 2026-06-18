import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '$models/Payment';
import { dbConnect } from '$utils/db';
import { buildPaymentFilter } from '$lib/server/cospendFilter';
import { error, json } from '@sveltejs/kit';

const BUCKETS = 24;
// Cap the amount axis so large settlements don't flatten the histogram; anything
// above this collects in a final overflow bin.
const CAP = 500;

// Bounds (global, stable slider extent) + an amount histogram for the payments
// filter bar. The histogram reflects every active filter EXCEPT the amount range
// (faceted), bucketed over the global bounds so the bars stay aligned to the
// slider while updating as other filters change.
export const GET: RequestHandler = async ({ locals, url }) => {
	const auth = locals.session ?? (await locals.auth());
	if (!auth || !auth.user?.nickname) {
		throw error(401, 'Not logged in');
	}

	await dbConnect();

	try {
		// Global bounds — unaffected by filters so the slider extent is stable.
		const [bounds] = await Payment.aggregate([
			{ $match: { amount: { $gt: 0 } } },
			{
				$group: {
					_id: null,
					min: { $min: '$amount' },
					max: { $max: '$amount' },
					minDate: { $min: '$date' },
					maxDate: { $max: '$date' }
				}
			}
		]);

		if (!bounds) {
			return json({ amount: { min: 0, max: 0 }, date: { min: null, max: null }, histogram: [], overflow: false });
		}

		// Histogram over the set matching all filters except the amount range.
		const filteredMatch = {
			...buildPaymentFilter(url.searchParams, { amount: false }),
			amount: { $gt: 0 }
		};
		const [filtered] = await Payment.aggregate([
			{ $match: filteredMatch },
			{ $group: { _id: null, amounts: { $push: '$amount' } } }
		]);

		const min = bounds.min as number;
		const rawMax = bounds.max as number;
		// Slider extent tops out at the cap; >cap collects in a final bin.
		const max = Math.min(CAP, rawMax);
		const overflow = rawMax > CAP;
		const amounts = (filtered?.amounts as number[]) ?? [];
		const histogram = new Array(BUCKETS + (overflow ? 1 : 0)).fill(0);
		if (max > min) {
			const bw = (max - min) / BUCKETS;
			for (const a of amounts) {
				if (overflow && a > CAP) {
					histogram[BUCKETS]++;
					continue;
				}
				let idx = Math.floor((a - min) / bw);
				if (idx >= BUCKETS) idx = BUCKETS - 1;
				if (idx < 0) idx = 0;
				histogram[idx]++;
			}
		} else if (amounts.length) {
			for (const a of amounts) {
				if (overflow && a > CAP) histogram[BUCKETS]++;
				else histogram[0]++;
			}
		}

		return json({
			amount: { min, max },
			date: { min: bounds.minDate, max: bounds.maxDate },
			histogram,
			overflow
		});
	} catch (e) {
		console.error('Failed to compute payment facets:', e);
		throw error(500, 'Failed to compute facets');
	}
};
