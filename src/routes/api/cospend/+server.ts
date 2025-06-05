import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { Payment } from '$lib/models/Payment'; // adjust path as needed
import { dbConnect, dbDisconnect } from '$lib/db/db';

const UPLOAD_DIR = '/var/lib/www/static/test';
const BASE_CURRENCY = 'CHF'; // Default currency

export const POST: RequestHandler = async ({ request, locals }) => {
  const formData = await request.formData();

  try {
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const date= new Date(formData.get('date') as string);
    const description = formData.get('description') as string;
    const note = formData.get('note') as string;
    const tags = JSON.parse(formData.get('tags') as string) as string[];
    let currency = formData.get('currency') as string;
    let original_amount = parseFloat(formData.get('original_amount') as string);
    let total_amount = NaN;

    // if currency is not BASE_CURRENCY, fetch current conversion rate using frankfurter API and date in YYYY-MM-DD format
    if (!currency || currency === BASE_CURRENCY) {
        currency = BASE_CURRENCY;
    	total_amount = parseFloat(formData.get('total_amount') as string);
    } else {
        const date_fmt = date.toISOString().split('T')[0]; // Convert date to YYYY-MM-DD format
        // Fetch conversion rate logic here (not implemented in this example)
        const res = await fetch(`https://api.frankfurter.app/${date_fmt}?from=${currency}&to=${BASE_CURRENCY}`)
	const { result } = await res.json();
	if (!result || !result[BASE_CURRENCY]) {
	    return new Response(JSON.stringify({ message: 'Currency conversion failed.' }), { status: 400 });
	}
	// Assuming you want to convert the total amount to BASE_CURRENCY
	const conversionRate = parseFloat(result.rates[BASE_CURRENCY]);
	alert(`Conversion rate from ${currency} to ${BASE_CURRENCY} on ${date_fmt}: ${conversionRate}`);
	total_amount = original_amount * conversionRate;
    }

    const personal_amounts = JSON.parse(formData.get('personal_amounts') as string) as { user: string, amount: number }[];


    if (!name || isNaN(total_amount)) {
      return new Response(JSON.stringify({ message: 'Invalid required fields.' }), { status: 400 });
    }

    // await mkdir(UPLOAD_DIR, { recursive: true });

    const images: { mediapath: string }[] = [];
    const imageFiles = formData.getAll('images') as File[];

    for (const file of imageFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const fullPath = path.join(UPLOAD_DIR, safeName);
      //fs.writeFileSync(fullPath, buffer);
      images.push({ mediapath: `/static/test/${safeName}` });
    }

    await dbConnect();
    const payment = new Payment({
      name,
      category,
      date,
      description,
      note,
      tags,
      total_amount,
      original_amount,
      currency,
      personal_amounts,
      images
    });


    // let auth =  await locals.auth();
    // // if(!auth){
    // 	throw error(401, "Not logged in")
    // }

    try{
    	await Payment.create(payment);
    } catch(e){
    	throw error(400, e)
    }
    await dbDisconnect();
    return new Response(JSON.stringify({ message: 'Payment event created successfully.' }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Error processing request.' }), { status: 500 });
  }
};
