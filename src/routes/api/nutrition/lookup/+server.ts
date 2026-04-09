import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';

export const GET: RequestHandler = async ({ url }) => {
	const source = url.searchParams.get('source');
	const id = url.searchParams.get('id');

	if (!source || !id) {
		return json({ error: 'source and id are required' }, { status: 400 });
	}

	if (source === 'bls') {
		const entry = BLS_DB.find(e => e.blsCode === id);
		if (!entry) return json({ error: 'Not found' }, { status: 404 });
		return json({ per100g: entry.per100g });
	}

	if (source === 'usda') {
		const fdcId = Number(id);
		const entry = NUTRITION_DB.find(e => e.fdcId === fdcId);
		if (!entry) return json({ error: 'Not found' }, { status: 404 });
		return json({ per100g: entry.per100g, portions: entry.portions });
	}

	return json({ error: 'Invalid source' }, { status: 400 });
};
