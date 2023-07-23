import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import { ALLOW_REGISTRATION } from '$env/static/private';
import { PEPPER } from '$env/static/private';
import {hashPassword} from '$lib/js/hashPassword'

import { User } from '../../../../models/User';
import { dbConnect, dbDisconnect } from '../../../../utils/db';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
	if(ALLOW_REGISTRATION){
		const {username, password} = await request.json()
		const salt = randomBytes(32).toString('hex'); // Generate a random salt

		const pass_hash =  await hashPassword(password + PEPPER, salt)
		await dbConnect();
		try{
			await User.create({
					username: username,
					pass_hash: pass_hash,
					salt: salt,
					access: [],
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
