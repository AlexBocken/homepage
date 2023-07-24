import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../models/Payment';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, cookies}) => {
  	let json = await request.json()

  	const user = await authenticateUser(cookies)
  	if(!user) throw error(401, "Need to be logged in")
  	if(!user.access.includes("abrechnung")){
		throw error(401, "Insufficient permissions")
	}
	else{
		await dbConnect();
		await Payment.findOneAndDelete({_id: json.id});
  		await dbDisconnect();
		return new Response(JSON.stringify({msg: "Deleted payment successfully"}),{
			    status: 200,
  		});
	}
}
