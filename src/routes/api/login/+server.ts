import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { sign } from 'jsonwebtoken';
import { hash, verify} from 'argon2';
import { COOKIE_SECRET } from '$env/static/private'

import { dbConnect, dbDisconnect } from '../../../utils/db';
import { User } from '../../../models/User';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
	const {username, password} = await request.json()
	await dbConnect()
	let res = await User.findOne({username: username}, 'pass_hash salt').lean()
	await dbDisconnect()
	if(!res){
		throw error(401, {message: "wrong password or user does not exist"})
	}

	const stored_pw = res.pass_hash
	const salt = res.salt

	const isMatch = await verify(stored_pw, password, {salt})
	if(!isMatch){
		throw error(401, {message: "wrong password or user does not exist"})
	}

	res = await createJWT(username)
	return new Response(JSON.stringify(res))
};

async function createJWT(username) {
	const payload = {
  	  username: username,
  	};

  	const masterSecret = COOKIE_SECRET;
  	const secretKey = masterSecret;
  	const jwt = sign(payload, secretKey);
  	return jwt
}
