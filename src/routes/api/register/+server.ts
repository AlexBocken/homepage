import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { sign } from 'jsonwebtoken';
import { hash, verify }  from 'argon2';
import { randomBytes } from 'crypto';
import { COOKIE_SECRET } from '$env/static/private'
import { ALLOW_REGISTRATION } from '$env/static/private'

import { User } from '../../../models/User';
import { dbConnect, dbDisconnect } from '../../../utils/db';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
	if(ALLOW_REGISTRATION){
		const {username, password, access} = await request.json()
		const salt = randomBytes(32).toString('hex'); // Generate a random salt

		const pass_hash =  await hashPassword(password, salt)
		await dbConnect();
		try{
			await User.create({
					username: username,
					pass_hash: pass_hash,
					salt: salt,
					access: access,
			})
		}catch(e){
			await dbDisconnect();
			throw error(400, e);
		}
		await dbDisconnect();
		return new Response(JSON.stringify({message: "User added successfully"}),
				    	{status: 200}
			);
	}
	else{
		throw error(401, "user registration currently closed")
	}


};

async function hashPassword(password, salt) {
  try {
    const hashedPassword = await hash(password, salt); // Hash the password with the salt
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}
