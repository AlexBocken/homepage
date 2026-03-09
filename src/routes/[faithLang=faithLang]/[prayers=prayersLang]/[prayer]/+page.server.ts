import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { validPrayerSlugs } from '$lib/data/prayerSlugs';

export const load: PageServerLoad = async ({ params, url }) => {
	if (!validPrayerSlugs.has(params.prayer)) {
		throw error(404, 'Prayer not found');
	}

	const latinParam = url.searchParams.get('latin');
	const hasUrlLatin = latinParam !== null;
	const initialLatin = hasUrlLatin ? latinParam !== '0' : true;

	return {
		prayer: params.prayer,
		initialLatin,
		hasUrlLatin
	};
};
