import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { hash }  from 'argon2';

import { PEPPER } from '$env/static/private';

import { User } from '../../../../models/User';
import { dbConnect, dbDisconnect } from '../../../../utils/db';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
	const {username, old_password, new_password} = await request.json()
	await dbConnect();
	const salt = await User.findOne({username: username}, 'salt');
	const pass_hash =  await hashPassword(old_password + PEPPER, salt)
	try{
		await User.updateOne({
				username: username,
				pass_hash: pass_hash,
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
};

async function hashPassword(password, salt) {
  try {
    const hashedPassword = await hash(password, salt); // Hash the password with the salt and pepper
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}
