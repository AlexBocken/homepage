import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { Payment } from '$lib/models/Payment'; // adjust path as needed
import { dbConnect, dbDisconnect } from '$lib/db/db';

const UPLOAD_DIR = '/var/lib/www/static/test';
const BASE_CURRENCY = 'CHF'; // Default currency

export const GET: RequestHandler = async ({ request, locals }) => {
    await dbConnect();

    const result = await Payment.aggregate([
  {
    $group: {
      _id: "$paid_by",
      totalPaid: { $sum: "$total_amount" },
      totalForSelf: { $sum: { $ifNull: ["$for_self", 0] } },
      totalForOther: { $sum: { $ifNull: ["$for_other", 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      paid_by: "$_id",
      netTotal: {
	$multiply: [
		{ $add: [
          { $subtract: ["$totalPaid", "$totalForSelf"] },
	  "$totalForOther"
        ] },
	0.5]
      }
    }
  }
]);
    await dbDisconnect();
    return json(result);
};
