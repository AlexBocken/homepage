import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../../models/Payment';
import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies}) => {
  let message = await request.json()
  const json = message.payment
  const user = await authenticateUser(cookies)
  if(!user){
	  throw error(403, "Not logged in")
  }
  else if(!user.access.includes("abrechnung")){
	throw error(403, "This user does not have edit permissions for payments")
  }
  else{
	await dbConnect();
	const payment = await Payment.findOne({_id: json.id}).lean();
  	await dbDisconnect();
	return new Response(JSON.stringify({payment}),{
			    status: 200,
  	});

  }
};
