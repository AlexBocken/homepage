import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../models/Payment';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';
import { User } from '../../../../models/User';
// header: use for bearer token for now
// recipe json in body
export const GET: RequestHandler = async ({request, cookies}) => {
  const user = await authenticateUser(cookies)
  if(!user){
	  throw error(403, "Not logged in")
  }
  else if(!user.access.includes("abrechnung")){
	throw error(403, "This user does not have edit permissions for payments")
  }
  else{
	await dbConnect();
	const users = await User.find({access: "abrechnung"}, 'username').lean()
  	await dbDisconnect();
	return new Response(JSON.stringify({users}),{
			    status: 200,
  	});

  }
};
