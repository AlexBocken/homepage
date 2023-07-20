import type { RequestEvent } from "@sveltejs/kit";
import { COOKIE_SECRET } from "$env/static/private";
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import { error } from "@sveltejs/kit";
import { dbConnect, dbDisconnect } from "../../utils/db";
import { User } from "../../models/User";;

export async function get_username(cookies){
	// Set your master secret key (replace with your own secret)
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
		return null
	}

	if(decoded){
		return {
			username: decoded.username,
		}
	}
	else{
		return null
	}
}
