import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { verify } from 'jsonwebtoken';
import { hash}  from 'argon2';
import { randomBytes } from 'crypto';
import { COOKIE_SECRET } from '$env/static/private'
import { ALLOW_REGISTRATION } from '$env/static/private'

import { User } from '../../../models/User';
import { dbConnect, dbDisconnect } from '../../../utils/db';


import { getJWTFromRequest } from '../../../utils/cookie';
// header: use for bearer token for now
// recipe json in body
export const GET: RequestHandler = async ({request}) => {
	const jwt = getJWTFromRequest(request)
	console.log(jwt)

  	// Set your master secret key (replace with your own secret)
  	const masterSecret = COOKIE_SECRET;
  	const secretKey = masterSecret
	let decoded
	try{
  		decoded = await verify(jwt, secretKey);
	}
	catch(e){
		throw error(401, "Cookies have changed, please log in again")
	}

	await dbConnect()
	let res = await User.findOne({username: decoded.username}, 'access').lean();
	await dbDisconnect()
	if(!res){
		throw error(404, "User for this Cookie does no longer exist")
	}
	return new Response(JSON.stringify({
			username: decoded.username,
			access: res.access
	}), {status: 200})
};

async function hashPassword(password, salt) {
  	try {
  	  const hashedPassword = await hash(password, salt); // Hash the password with the salt
  	  return hashedPassword;
  	} catch (error) {
  	  console.error('Error hashing password:', error);
  	}
}



async function createJWT(username, userSalt) {
	const payload = {
  	  username: username,
  	};

  	const masterSecret = COOKIE_SECRET;
  	const secretKey = masterSecret + userSalt;
  	const jwt = sign(payload, secretKey);
  	return jwt
}
