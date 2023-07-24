import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../../models/Payment';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies, params}) => {
  let message = await request.json()
  const n = params.range
  const start = message?.start ?? 0;
  const user = await authenticateUser(cookies)
  if(!user){
	  throw error(403, "Not logged in")
  }
  else if(!user.access.includes("abrechnung")){
	throw error(403, "This user does not have viewing permissions for payments")
  }
  else{
	await dbConnect();
	const payments = await Payment.find({}).sort({ date: -1 }).skip(start).limit(n).lean()
  	await dbDisconnect();
	return new Response(JSON.stringify({payments}),{
			    status: 200,
  	});

  }
};
