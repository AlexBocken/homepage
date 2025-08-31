import { json, type RequestHandler } from '@sveltejs/kit';
import { Payment } from '$lib/models/Payment';
import { dbConnect, dbDisconnect } from '$lib/db/db';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({params}) => {
  await dbConnect();
  const number_payments = 10;
  const number_skip = params.pageno ? (parseInt(params.pageno) - 1 ) * number_payments : 0;
  let payments = await Payment.find()
  .sort({ transaction_date: -1 })
  .skip(number_skip)
  .limit(number_payments);
  await dbDisconnect();

  if(payments == null){
	throw error(404, "No more payments found");
  }
  return json(payments);
};
