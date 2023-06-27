import { writeFileSync } from 'fs';
import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { BEARER_TOKEN } from '$env/static/private'
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request })  => {
    const data = await request.json();
    console.log(data)
    const filePath = path.join(
            process.cwd(),
            "static",
            "images",
	    data.filename as string
        );
    const file = data.image;
    console.log(data.headers)
    if(data.bearer === BEARER_TOKEN){
	console.log("PASSWORD CORRECT")
    	writeFileSync(filePath, file, 'base64');
    }
    else{
	console.log("PASSWORD INCORRECT")
    	throw error(403, "Password incorrect")
    }

}) satisfies RequestHandler;
