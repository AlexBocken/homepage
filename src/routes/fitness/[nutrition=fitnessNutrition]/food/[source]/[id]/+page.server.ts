import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { DRI_MALE } from '$lib/data/dailyReferenceIntake';

export const load: PageServerLoad = async ({ params }) => {
	const { source, id } = params;

	if (source !== 'bls' && source !== 'usda') {
		throw error(404, 'Invalid source');
	}

	if (source === 'bls') {
		const entry = BLS_DB.find(e => e.blsCode === id);
		if (!entry) throw error(404, 'Food not found');
		return {
			food: {
				source: 'bls' as const,
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				nameDe: entry.nameDe,
				nameEn: entry.nameEn,
				category: entry.category,
				per100g: entry.per100g,
			},
			dri: DRI_MALE,
		};
	}

	// USDA
	const fdcId = Number(id);
	const entry = NUTRITION_DB.find(e => e.fdcId === fdcId);
	if (!entry) throw error(404, 'Food not found');
	return {
		food: {
			source: 'usda' as const,
			id: String(entry.fdcId),
			name: entry.name,
			category: entry.category,
			per100g: entry.per100g,
			portions: entry.portions,
		},
		dri: DRI_MALE,
	};
};
