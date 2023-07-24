import type { RequestHandler } from '@sveltejs/kit';
import { Payment } from '../../../../models/Payment';
import { dbConnect, dbDisconnect } from '../../../../utils/db';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';;
import sharp from 'sharp';
import path from 'path';
import {IMAGE_DIR} from '$env/static/private';

export const POST: RequestHandler = async ({request, cookies}) => {
  	const user = await authenticateUser(cookies)
	console.log(user)
  	if(!user){
  		throw error(401, "Not logged in")
  	}
  	if(!user.access.includes("abrechnung")){
  	      	throw error(401, "This user does not have permissions to add payments")
  	}
  	else{
		const formData = await request.formData();
		const json = {
			amount: formData.get("amount"),
			for_self: formData.get("for_self"),
			for_other: formData.get("for_other"),
			payee: formData.get("payee"),
			added_by: user._id
		}

		await dbConnect();
		let id;
  		try{
  	      		id = (await Payment.create(json))._id.toString();
  		} catch(e){
  			await dbDisconnect();
  	      		throw error(400, e)
  	      	}

  		await dbDisconnect();
		const img = formData.get("file")
		if(img){
			console.log("IMG:", img)
			const full_res = Buffer.from(await img.arrayBuffer())

			await sharp(full_res)
				.toFormat('webp')
				.toFile(path.join(IMAGE_DIR,
					  "abrechnung",
					  "full",
					   id + '.webp'))

	   		await sharp(full_res)
				.resize({width: 20})
				.toFormat('webp')
				.toFile(path.join(IMAGE_DIR,
					  "abrechnung",
					  "placeholder",
					   id + '.webp'))
		}
  	      	return new Response(JSON.stringify({message: "Added payment successfully"}),{
  	      		    status: 200,
  		});
  	}
};
