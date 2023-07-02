import { writeFileSync } from 'fs';
import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { BEARER_TOKEN } from '$env/static/private'
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request })  => {
    const data = await request.json();
    const filePath = path.join(
            process.cwd(),
            "static",
            "images",
	    data.filename as string
        );
    const file = data.image;
    if(data.bearer === BEARER_TOKEN){
    	writeFileSync(filePath, file, 'base64');
	return new Response(JSON.stringify({msg: "Added image successfully"}),{
			    status: 200,
  	});
    }
    else{
    	throw error(403, "Password incorrect")
    }

}) satisfies RequestHandler;
