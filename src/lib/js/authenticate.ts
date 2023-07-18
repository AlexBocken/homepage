import type { RequestEvent } from "@sveltejs/kit";
import { COOKIE_SECRET } from "$env/static/private";
import { verify } from "jsonwebtoken";
import { error } from "@sveltejs/kit";
import { dbConnect, dbDisconnect } from "../../utils/db";
import { User } from "../../models/User";;

export async function authenticateUser(event: RequestEvent){
// Set your master secret key (replace with your own secret)
	const { cookies } = event;
	const masterSecret = COOKIE_SECRET;
	const secretKey = masterSecret
	let decoded
	try{
		const cookie : string = cookies.get("UserSession")
		if(cookie){
			decoded = await verify(cookie, secretKey);
		}

	}
	catch(e){
		throw error(401, "Cookies have changed, please log in again")
	}

	if(decoded){
		await dbConnect()
		let res = await User.findOne({username: decoded.username}, 'access').lean();
		await dbDisconnect()
		if(!res){
			throw error(404, "User for this Cookie does no longer exist")
		}
		return {
			username: decoded.username,
			access: res.access
		}
	}
	else{
		return null
	}
}
