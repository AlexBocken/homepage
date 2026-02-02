import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

// Valid prayer slugs (both languages)
const validSlugs = new Set([
	'das-heilige-kreuzzeichen', 'the-sign-of-the-cross',
	'gloria-patri',
	'paternoster', 'our-father',
	'credo', 'nicene-creed',
	'ave-maria', 'hail-mary',
	'salve-regina',
	'das-fatimagebet', 'fatima-prayer',
	'gloria',
	'gebet-zum-hl-erzengel-michael', 'prayer-to-st-michael-the-archangel',
	'bruder-klaus-gebet', 'prayer-of-st-nicholas-of-flue',
	'josephgebet-des-hl-papst-pius-x', 'prayer-to-st-joseph-by-pope-st-pius-x',
	'das-confiteor', 'the-confiteor'
]);

export const load: PageServerLoad = async ({ params }) => {
	if (!validSlugs.has(params.prayer)) {
		throw error(404, 'Prayer not found');
	}

	return {
		prayer: params.prayer
	};
};
