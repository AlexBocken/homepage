import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

import { dbConnect, dbDisconnect } from '../../../../../utils/db';
import { User } from '../../../../../models/User';
import { get_username } from '$lib/js/get_username';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({cookies}) => {
	const requesting_user = await get_username(cookies)
	await dbConnect()
	let res = await User.findOne({username: requesting_user}, 'access').lean()
	if(!res.access.contains("admin")){
		await dbDisconnect()
		throw error(401, {message: "Your user does not have the permissions to do this"})
	}
	else{
		let res = await User.find({}, 'username access').lean()
		await dbDisconnect()
		return { res }
	}
};
