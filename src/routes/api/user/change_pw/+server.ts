import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { verify }  from 'argon2';
import { hashPassword } from '$lib/js/hashPassword'
import {randomBytes} from 'crypto'

import { PEPPER } from '$env/static/private';

import { User } from '../../../../models/User';
import { dbConnect, dbDisconnect } from '../../../../utils/db';

// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request}) => {
	const {username, old_password, new_password, new_password_rep} = await request.json()
  if(new_password != new_password_rep){
    throw error(400, 'new passwords do not match!')
  }
	await dbConnect();
	const user = await User.findOne({username: username});
  console.log("Found user:", user)
  const isMatch = await verify(user.pass_hash, old_password + PEPPER, {salt: user.salt})
  console.log("isMatch:", isMatch)
  if(isMatch){
		const salt = randomBytes(32).toString('hex'); // Generate a random salt
    const pass_hash = await hashPassword(new_password + PEPPER, salt)
    await User.findOneAndUpdate({username: username}, {pass_hash: pass_hash, salt: salt})
    await dbDisconnect()
	  return new Response(JSON.stringify({message: "Password updated successfully"}),
                        {status: 200})
  }
  else{
	  await dbDisconnect();
    throw error(401, "Wrong old password")
	}
};
